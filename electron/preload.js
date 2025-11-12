const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Thermal Printing
  print: {
    thermal: (data) => ipcRenderer.invoke('print:thermal', data),
    getAvailablePrinters: () => ipcRenderer.invoke('print:getAvailablePrinters'),
    setDefaultPrinter: (printerName) => ipcRenderer.invoke('print:setDefaultPrinter', printerName),
  },
  
  // Data Sync
  sync: {
    saveLocal: (data) => ipcRenderer.invoke('sync:saveLocal', data),
    getLocal: (key) => ipcRenderer.invoke('sync:getLocal', key),
    syncToServer: () => ipcRenderer.invoke('sync:syncToServer'),
    getLastSyncTime: () => ipcRenderer.invoke('sync:getLastSyncTime'),
  },
  
  // App Info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    quit: () => ipcRenderer.send('app:quit'),
  },
  
  // Window Controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  }
});
