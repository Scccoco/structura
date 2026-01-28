// Speckle Sync Service for Most (Мост)
// Синхронизация элементов (не сборок) — каждый объект = отдельный элемент

export interface SpeckleElementData {
    speckle_object_id: string;
    guid: string;             // applicationId (ключ синхронизации)
    name: string;
    element_type: string;     // speckle_type или IFC Class
    profile?: string;
    material?: string;
    weight_kg?: number;
    volume_m3?: number;
    length_m?: number;
    properties?: Record<string, unknown>;
}

export interface SyncDiff {
    added: SpeckleElementData[];
    updated: SpeckleElementData[];  // guid совпадает, но данные изменились
    removed: string[];              // guid удалённых
    unchanged: string[];            // guid неизменённых
}

export interface DbElement {
    id: number;
    guid: string;
    speckle_object_id?: string;
    name?: string;
    element_type?: string;
    profile?: string;
    material?: string;
    weight_kg?: number;
}

/**
 * Получить все элементы из Speckle коммита
 * В отличие от ZMK — не группируем по сборкам, каждый объект = элемент
 */
export async function fetchSpeckleElements(
    serverUrl: string,
    streamId: string,
    commitId: string,
    token: string
): Promise<SpeckleElementData[]> {

    // 1. Получить referencedObject из коммита
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

    // 3. Парсинг каждого объекта в элемент
    const elements: SpeckleElementData[] = [];

    for (const obj of rawObjects) {
        const data = obj.data;

        // Пропускаем объекты без applicationId (не являются элементами модели)
        if (!data?.applicationId) continue;

        // DEBUG: показать структуру первых 3 объектов
        if (elements.length < 3) {
            console.log('🔍 DEBUG element:', {
                id: obj.id,
                applicationId: data.applicationId,
                name: data.name,
                speckle_type: data.speckle_type,
                properties: data.properties ? Object.keys(data.properties) : 'no properties'
            });
        }

        // Извлечение данных из разных форматов
        const props = data.properties || {};
        const uda = props['User Defined Attributes'] || {};
        const report = props.Report || {};

        const element: SpeckleElementData = {
            speckle_object_id: obj.id,
            guid: data.applicationId,
            name: data.name || uda.NAME || '',
            element_type: data.speckle_type || props.type || '',
            profile: props.profile || uda.PROFILE || '',
            material: props.material || uda.MATERIAL || uda.GRADE || '',
            weight_kg: report.WEIGHT?.value || props.weight || undefined,
            volume_m3: report.VOLUME?.value || props.volume || undefined,
            length_m: report.LENGTH?.value || props.length || undefined,
            properties: {
                ...uda,
                ...report,
                speckle_type: data.speckle_type
            }
        };

        elements.push(element);
    }

    console.log(`📊 Parsed ${rawObjects.length} objects -> ${elements.length} elements with applicationId`);

    return elements;
}

/**
 * Сравнить данные Speckle с БД для определения diff
 */
export function compareSyncData(
    speckleData: SpeckleElementData[],
    dbElements: DbElement[]
): SyncDiff {

    const speckleMap = new Map(speckleData.map(d => [d.guid, d]));
    const dbMap = new Map(dbElements.map(d => [d.guid, d]));

    const speckleGuids = new Set(speckleData.map(d => d.guid));
    const dbGuids = new Set(dbElements.map(d => d.guid));

    // Новые элементы: есть в Speckle, нет в БД
    const added = speckleData.filter(d => !dbGuids.has(d.guid));

    // Удалённые: есть в БД, нет в Speckle
    const removed = dbElements.filter(d => !speckleGuids.has(d.guid)).map(d => d.guid);

    // Обновлённые: есть и там и там, но изменились данные
    const updated: SpeckleElementData[] = [];
    const unchanged: string[] = [];

    for (const guid of dbGuids) {
        if (!speckleGuids.has(guid)) continue; // уже в removed

        const speckleEl = speckleMap.get(guid)!;
        const dbEl = dbMap.get(guid)!;

        // Простое сравнение по speckle_object_id (если изменился — объект обновился)
        if (speckleEl.speckle_object_id !== dbEl.speckle_object_id) {
            updated.push(speckleEl);
        } else {
            unchanged.push(guid);
        }
    }

    return { added, updated, removed, unchanged };
}

/**
 * Получить список коммитов из Speckle
 */
export async function fetchCommits(
    serverUrl: string,
    streamId: string,
    token: string,
    limit: number = 20
): Promise<{ id: string; message: string; createdAt: string; referencedObject: string }[]> {

    const query = `
    query GetCommits {
      stream(id: "${streamId}") {
        commits(limit: ${limit}) {
          items {
            id
            message
            createdAt
            referencedObject
          }
        }
      }
    }
  `;

    const response = await fetch(`${serverUrl}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    });

    const data = await response.json();
    return data.data?.stream?.commits?.items || [];
}
