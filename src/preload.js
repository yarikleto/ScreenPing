const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectRegion: () => ipcRenderer.invoke('select-region'),
  startMonitoring: () => ipcRenderer.invoke('start-monitoring'),
  stopMonitoring: () => ipcRenderer.invoke('stop-monitoring'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  onStatusUpdate: (cb) => {
    ipcRenderer.on('status-update', (_e, data) => cb(data));
  },
  onMonitoringStopped: (cb) => {
    ipcRenderer.on('monitoring-stopped', (_e) => cb());
  },
});
