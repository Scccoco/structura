import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods for renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Dialogs
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
    openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),

    // Network
    isOnline: () => ipcRenderer.invoke('network:isOnline'),

    // Folder scanning
    scanPDFFolder: (folderPath: string) => ipcRenderer.invoke('folder:scanPDFs', folderPath),

    // Database: Projects
    getProjects: () => ipcRenderer.invoke('db:projects:getAll'),
    upsertProject: (project: any) => ipcRenderer.invoke('db:projects:upsert', project),

    // Database: Elements
    getElementsByProject: (projectId: string) => ipcRenderer.invoke('db:elements:getByProject', projectId),
    upsertElement: (element: any) => ipcRenderer.invoke('db:elements:upsert', element),
    updateElementStatus: (guid: string, status: string) => ipcRenderer.invoke('db:elements:updateStatus', guid, status),

    // Database: Acts
    getActs: () => ipcRenderer.invoke('db:acts:getAll'),
    insertAct: (act: any) => ipcRenderer.invoke('db:acts:insert', act),

    // Database: Element-Act Links
    getActsByElement: (elementGuid: string) => ipcRenderer.invoke('db:elementActs:getByElement', elementGuid),
    linkActToElement: (elementGuid: string, actId: string) => ipcRenderer.invoke('db:elementActs:link', elementGuid, actId),
    unlinkActFromElement: (elementGuid: string, actId: string) => ipcRenderer.invoke('db:elementActs:unlink', elementGuid, actId),

    // Sync
    getPendingSync: () => ipcRenderer.invoke('db:sync:getPending'),
    markSynced: (ids: string[]) => ipcRenderer.invoke('db:sync:markSynced', ids),
});

// Type declarations for renderer
export interface ElectronAPI {
    selectDirectory: () => Promise<string | null>;
    openPath: (path: string) => Promise<string>;
    isOnline: () => Promise<boolean>;

    // Folder scanning
    scanPDFFolder: (folderPath: string) => Promise<{ success: boolean; count: number; acts: any[] }>;

    getProjects: () => Promise<any[]>;
    upsertProject: (project: any) => Promise<any>;

    getElementsByProject: (projectId: string) => Promise<any[]>;
    upsertElement: (element: any) => Promise<any>;
    updateElementStatus: (guid: string, status: string) => Promise<any>;

    getActs: () => Promise<any[]>;
    insertAct: (act: any) => Promise<any>;

    getActsByElement: (elementGuid: string) => Promise<any[]>;
    linkActToElement: (elementGuid: string, actId: string) => Promise<any>;
    unlinkActFromElement: (elementGuid: string, actId: string) => Promise<any>;

    getPendingSync: () => Promise<any[]>;
    markSynced: (ids: string[]) => Promise<any>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
