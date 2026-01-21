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

  // 1. Получить referencedObject из коммита через stream API (без hardcoded model ID)
  const commitQuery = `
    query GetCommit {
      stream(id: "${streamId}") {
        commit(id: "${commitId}") {
          referencedObject
        }
      }
    }
  `;

  const commitRes = await fetch(`${serverUrl}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ query: commitQuery })
  });

  const commitData = await commitRes.json();
  console.log('🔍 Commit query response:', commitData);
  const referencedObject = commitData.data?.stream?.commit?.referencedObject;

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

  // 3. Парсинг TeklaObject с UDA и группировка по mainpartGuid
  const assemblyMap = new Map<string, SpeckleAssemblyData>();

  for (const obj of rawObjects) {
    const data = obj.data;

    // Проверяем что это TeklaObject
    if (!data?.speckle_type?.includes('TeklaObject')) continue;

    const uda = data.properties?.['User Defined Attributes'];

    // DEBUG: показать структуру первых 3 объектов
    if (assemblyMap.size < 3) {
      console.log('🔍 DEBUG object:', {
        id: obj.id,
        name: data.name,
        speckle_type: data.speckle_type,
        applicationId: data.applicationId,
        uda: uda,
        allKeys: uda ? Object.keys(uda) : 'no UDA'
      });
    }

    if (!uda?.ST_MAINPART_GUID) continue;

    const mainpartGuid = uda.ST_MAINPART_GUID;
    const weight = data.properties?.Report?.WEIGHT?.value || 0;

    // Если сборка уже есть — просто добавляем вес
    if (assemblyMap.has(mainpartGuid)) {
      const existing = assemblyMap.get(mainpartGuid)!;
      existing.weight = (existing.weight || 0) + weight;
    } else {
      // Новая сборка
      assemblyMap.set(mainpartGuid, {
        speckleObjectId: obj.id,
        applicationId: data.applicationId || '',
        mainpartGuid: mainpartGuid,
        assemblyGuid: uda.ST_ASSEMBLY_GUID || '',
        assemblyMark: uda.ST_ASSEMBLY_MARK || data.properties?.Report?.ASSEMBLY_POS?.value || '',
        name: data.name || '',
        profile: data.properties?.profile || '',
        material: data.properties?.material || '',
        weight: weight
      });
    }
  }

  console.log(`📊 Parsed ${rawObjects.length} objects -> ${assemblyMap.size} unique assemblies`);

  return Array.from(assemblyMap.values());
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
