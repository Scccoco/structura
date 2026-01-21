// Speckle Sync Service
// Парсинг данных из Speckle и сравнение с БД

export interface SpeckleAssemblyData {
    speckleObjectId: string;
    applicationId: string; // GUID детали
    mainpartGuid: string;   // ST_MAINPART_GUID (ключ учёта)
    assemblyGuid: string;   // ST_ASSEMBLY_GUID
    assemblyMark: string;   // ST_ASSEMBLY_MARK
    name: string;
    profile?: string;
    material?: string;
    weight?: number;
}

export interface SyncDiff {
    added: SpeckleAssemblyData[];
    removed: string[]; // mainpart_guid удалённых
    unchanged: string[]; // mainpart_guid неизменённых
}

/**
 * Получить объекты из Speckle коммита
 */
export async function fetchSpeckleObjects(
    serverUrl: string,
    streamId: string,
    commitId: string,
    token: string
): Promise<SpeckleAssemblyData[]> {

    // 1. Получить referencedObject из коммита
    const versionQuery = `
    query GetVersion {
      project(id: "${streamId}") {
        model(id: "f903a0aa61") {
          version(id: "${commitId}") {
            referencedObject
          }
        }
      }
    }
  `;

    const versionRes = await fetch(`${serverUrl}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: versionQuery })
    });

    const versionData = await versionRes.json();
    const referencedObject = versionData.data?.project?.model?.version?.referencedObject;

    if (!referencedObject) {
        throw new Error('Failed to get referenced object from commit');
    }

    // 2. Получить все объекты
    const objectsQuery = `
    query GetObjects {
      stream(id: "${streamId}") {
        object(id: "${referencedObject}") {
          children(limit: 10000) {
            objects {
              id
              data
            }
          }
        }
      }
    }
  `;

    const objectsRes = await fetch(`${serverUrl}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: objectsQuery })
    });

    const objectsData = await objectsRes.json();
    const rawObjects = objectsData.data?.stream?.object?.children?.objects || [];

    // 3. Парсинг TeklaObject с UDA
    const assemblies: SpeckleAssemblyData[] = [];

    for (const obj of rawObjects) {
        const data = obj.data;

        // Проверяем что это TeklaObject
        if (!data?.speckle_type?.includes('TeklaObject')) continue;

        const uda = data.properties?.['User Defined Attributes'];
        if (!uda?.ST_MAINPART_GUID) continue;

        assemblies.push({
            speckleObjectId: obj.id,
            applicationId: data.applicationId || '',
            mainpartGuid: uda.ST_MAINPART_GUID,
            assemblyGuid: uda.ST_ASSEMBLY_GUID || '',
            assemblyMark: uda.ST_ASSEMBLY_MARK || data.properties?.Report?.ASSEMBLY_POS?.value || '',
            name: data.name || '',
            profile: data.properties?.profile || '',
            material: data.properties?.material || '',
            weight: data.properties?.Report?.WEIGHT?.value || 0
        });
    }

    return assemblies;
}

/**
 * Сравнить данные Speckle с БД
 */
export function compareSyncData(
    speckleData: SpeckleAssemblyData[],
    dbMainpartGuids: string[]
): SyncDiff {

    const speckleGuids = new Set(speckleData.map(d => d.mainpartGuid));
    const dbGuidsSet = new Set(dbMainpartGuids);

    // Новые элементы: есть в Speckle, нет в БД
    const added = speckleData.filter(d => !dbGuidsSet.has(d.mainpartGuid));

    // Удалённые: есть в БД, нет в Speckle
    const removed = dbMainpartGuids.filter(guid => !speckleGuids.has(guid));

    // Неизменённые: есть и там и там
    const unchanged = dbMainpartGuids.filter(guid => speckleGuids.has(guid));

    return { added, removed, unchanged };
}
