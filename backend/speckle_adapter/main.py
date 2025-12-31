from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from speckle_client import SpeckleAdapter
from database import Database

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
adapter = SpeckleAdapter()
db = Database()

@app.get("/debug/{stream_id}/{model_id}")
async def debug(stream_id: str, model_id: str):
    try:
        object_id = await adapter.resolve_object_id(stream_id, model_id)
        root = adapter.receive_object_tree(stream_id, object_id)
        items = adapter.traverse_and_extract(root, limit=2000)
        return {
            "stream_id": stream_id,
            "model_id": model_id,
            "object_id": object_id,
            "count": len(items),
            "items": items[:2000],
        }
    except Exception as e:
        print(f"ERROR: {str(e)}") # Log to container output
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sync/{stream_id}/{model_id}")
async def sync(stream_id: str, model_id: str):
    try:
        # 1. Resolve & Extract
        object_id = await adapter.resolve_object_id(stream_id, model_id)
        root = adapter.receive_object_tree(stream_id, object_id)
        items = adapter.traverse_and_extract(root, limit=10000) # Higher limit for sync
        
        # 2. Save to DB
        result = db.sync_data(stream_id, model_id, object_id, items)
        
        return {
            "status": "success",
            "message": "Data synchronized successfully",
            "details": result
        }
    except Exception as e:
        print(f"ERROR SYNC: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- BUSINESS LOGIC API ---

from pydantic import BaseModel
from typing import List

class StatusUpdate(BaseModel):
    speckle_ids: List[str]
    status: str

@app.get("/project-data/{stream_id}/{model_id}")
def get_project_data(stream_id: str, model_id: str):
    """
    Returns business data (status, etc) for elements in a model branch.
    """
    try:
        data = db.get_elements_status(stream_id, model_id)
        return {"items": data, "count": len(data)}
    except Exception as e:
        print(f"ERROR GET DATA: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/update-status")
def update_status(update: StatusUpdate):
    """
    Updates status for a list of elements.
    """
    try:
        count = db.update_element_statuses(update.speckle_ids, update.status)
        return {"status": "success", "updated": count}
    except Exception as e:
        print(f"ERROR UPDATE: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
