"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods for renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Dialogs
    selectDirectory: () => electron_1.ipcRenderer.invoke('dialog:selectDirectory'),
    openPath: (path) => electron_1.ipcRenderer.invoke('shell:openPath', path),
    // Network
    isOnline: () => electron_1.ipcRenderer.invoke('network:isOnline'),
    // Folder scanning
    scanPDFFolder: (folderPath) => electron_1.ipcRenderer.invoke('folder:scanPDFs', folderPath),
    // Database: Projects
    getProjects: () => electron_1.ipcRenderer.invoke('db:projects:getAll'),
    upsertProject: (project) => electron_1.ipcRenderer.invoke('db:projects:upsert', project),
    // Database: Elements
    getElementsByProject: (projectId) => electron_1.ipcRenderer.invoke('db:elements:getByProject', projectId),
    upsertElement: (element) => electron_1.ipcRenderer.invoke('db:elements:upsert', element),
    updateElementStatus: (guid, status) => electron_1.ipcRenderer.invoke('db:elements:updateStatus', guid, status),
    // Database: Acts
    getActs: () => electron_1.ipcRenderer.invoke('db:acts:getAll'),
    insertAct: (act) => electron_1.ipcRenderer.invoke('db:acts:insert', act),
    // Database: Element-Act Links
    getActsByElement: (elementGuid) => electron_1.ipcRenderer.invoke('db:elementActs:getByElement', elementGuid),
    linkActToElement: (elementGuid, actId) => electron_1.ipcRenderer.invoke('db:elementActs:link', elementGuid, actId),
    unlinkActFromElement: (elementGuid, actId) => electron_1.ipcRenderer.invoke('db:elementActs:unlink', elementGuid, actId),
    // Sync
    getPendingSync: () => electron_1.ipcRenderer.invoke('db:sync:getPending'),
    markSynced: (ids) => electron_1.ipcRenderer.invoke('db:sync:markSynced', ids),
});
