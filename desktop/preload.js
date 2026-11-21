const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  saveFile: (name, data) => ipcRenderer.invoke('save-file', name, data),
  saveReportPDF: (name, html) => ipcRenderer.invoke('save-report-pdf', name, html)
});
