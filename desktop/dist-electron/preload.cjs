var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
import { contextBridge, ipcRenderer } from "electron";
var require_preload = __commonJS({
  "preload.cjs"() {
    contextBridge.exposeInMainWorld("electronAPI", {
      // Dialogs
      selectDirectory: () => ipcRenderer.invoke("dialog:selectDirectory"),
      openPath: (path) => ipcRenderer.invoke("shell:openPath", path),
      // Network
      isOnline: () => ipcRenderer.invoke("network:isOnline"),
      // Folder scanning
      scanPDFFolder: (folderPath) => ipcRenderer.invoke("folder:scanPDFs", folderPath),
      // Database: Projects
      getProjects: () => ipcRenderer.invoke("db:projects:getAll"),
      upsertProject: (project) => ipcRenderer.invoke("db:projects:upsert", project),
      // Database: Elements
      getElementsByProject: (projectId) => ipcRenderer.invoke("db:elements:getByProject", projectId),
      upsertElement: (element) => ipcRenderer.invoke("db:elements:upsert", element),
      updateElementStatus: (guid, status) => ipcRenderer.invoke("db:elements:updateStatus", guid, status),
      // Database: Acts
      getActs: () => ipcRenderer.invoke("db:acts:getAll"),
      insertAct: (act) => ipcRenderer.invoke("db:acts:insert", act),
      // Database: Element-Act Links
      getActsByElement: (elementGuid) => ipcRenderer.invoke("db:elementActs:getByElement", elementGuid),
      linkActToElement: (elementGuid, actId) => ipcRenderer.invoke("db:elementActs:link", elementGuid, actId),
      unlinkActFromElement: (elementGuid, actId) => ipcRenderer.invoke("db:elementActs:unlink", elementGuid, actId),
      // Sync
      getPendingSync: () => ipcRenderer.invoke("db:sync:getPending"),
      markSynced: (ids) => ipcRenderer.invoke("db:sync:markSynced", ids)
    });
  }
});
export default require_preload();
