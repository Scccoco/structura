import os
from typing import Any, Dict, List, Optional, Set

import httpx
from specklepy.api import operations
from specklepy.transports.server import ServerTransport
from specklepy.core.api.credentials import Account, ServerInfo, UserInfo


class SpeckleAdapter:
    def __init__(self):
        self.server_url = os.getenv("SPECKLE_SERVER_URL", "http://speckle-server_dev:3000").rstrip("/")
        self.token = os.getenv("SPECKLE_TOKEN")

        if not self.token:
            raise RuntimeError("SPECKLE_TOKEN is not set")

        if not (self.server_url.startswith("http://") or self.server_url.startswith("https://")):
            self.server_url = "http://" + self.server_url

        self.graphql_url = f"{self.server_url}/graphql"

        self.account = Account(
            token=self.token,
            serverInfo=ServerInfo(url=self.server_url, name="Speckle"),
            userInfo=UserInfo(id="adapter", name="Speckle Adapter"),
        )

    async def _gql(self, query: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {self.token}"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(self.graphql_url, json={"query": query, "variables": variables}, headers=headers)

        data = r.json()
        if r.status_code >= 400:
            raise RuntimeError(f"GraphQL HTTP {r.status_code}: {data}")

        if "errors" in data and data["errors"]:
            raise RuntimeError(f"GraphQL errors: {data['errors']}")

        return data["data"]

    async def resolve_object_id(self, stream_id: str, model_id: str) -> str:
        query = """
        query StreamBranches($streamId: String!) {
          stream(id: $streamId) {
            branches(limit: 200) {
              items {
                id
                name
                commits(limit: 1) {
                  items {
                    referencedObject
                    createdAt
                  }
                }
              }
            }
          }
        }
        """
        data = await self._gql(query, {"streamId": stream_id})

        if not data or not data.get("stream"):
            raise RuntimeError(f"Stream {stream_id} not found or no access")

        branches = data["stream"].get("branches", {}).get("items", [])
        target_branch = next((b for b in branches if b.get("id") == model_id), None)

        if not target_branch:
            raise RuntimeError(f"Model (Branch) with ID {model_id} not found in stream {stream_id}")

        commits = target_branch.get("commits", {}).get("items", [])
        if not commits:
            raise RuntimeError("No commits found for this model/branch")

        object_id = commits[0].get("referencedObject")
        if not object_id:
            raise RuntimeError("Latest commit has no referencedObject")

        return object_id

    def receive_object_tree(self, stream_id: str, object_id: str):
        transport = ServerTransport(stream_id=stream_id, account=self.account)
        root_obj = operations.receive(object_id, transport)
        return root_obj

    def traverse_and_extract(
        self,
        base_object,
        limit: int = 20000,
        include_assemblies: bool = False
    ) -> List[Dict[str, Any]]:
        elements: List[Dict[str, Any]] = []
        found = 0
        stack = [base_object]

        seen_stable: Set[str] = set()
        seen_speckle_obj: Set[str] = set()

        while stack and found < limit:
            obj = stack.pop()

            # защита от циклов/повторов по speckle object id
            obj_id = getattr(obj, "id", None)
            if obj_id and obj_id in seen_speckle_obj:
                continue
            if obj_id:
                seen_speckle_obj.add(obj_id)

            data = self._extract_element_data(obj, include_assemblies=include_assemblies)

            if data:
                stable = data["guid"]
                if stable in seen_stable:
                    continue
                seen_stable.add(stable)

                elements.append(data)
                found += 1

            # часто элементы лежат в obj.elements
            try:
                el = getattr(obj, "elements", None)
                if el:
                    stack.extend(el)
            except Exception:
                pass

            # общий проход по __dict__ (много где лежат массивы)
            try:
                d = getattr(obj, "__dict__", None)
                if isinstance(d, dict):
                    for v in d.values():
                        if isinstance(v, list):
                            for it in v:
                                if hasattr(it, "speckle_type"):
                                    stack.append(it)
                        else:
                            if hasattr(v, "speckle_type"):
                                stack.append(v)
            except Exception:
                pass

        return elements

    def _extract_element_data(self, obj, include_assemblies: bool) -> Optional[Dict[str, Any]]:
        speckle_type = (getattr(obj, "speckle_type", "") or "").strip()
        if not speckle_type:
            return None

        # шум
        if any(x in speckle_type for x in ("RenderMaterial", "Proxy", "Mesh")):
            return None

        ifc_type = getattr(obj, "ifcType", None)

        # сборки отдельно, по умолчанию режем
        if not include_assemblies:
            if ifc_type == "IFCELEMENTASSEMBLY":
                return None
            if speckle_type.endswith("IFCElementAssembly"):
                return None

        stable_id = None
        source = None

        if getattr(obj, "ifcGlobalId", None):
            stable_id = getattr(obj, "ifcGlobalId")
            source = "ifcGlobalId"
        elif getattr(obj, "applicationId", None):
            stable_id = getattr(obj, "applicationId")
            source = "applicationId"

        if not stable_id:
            return None

        name = getattr(obj, "name", None) or "Unnamed"
        simple_type = speckle_type.split(".")[-1]

        return {
            "guid": stable_id,                       # стабильный ключ
            "speckle_id": getattr(obj, "id", None),  # нужен для viewer setColor
            "name": name,
            "type": simple_type,
            "ifc_type": ifc_type,
            "source": source,
        }
