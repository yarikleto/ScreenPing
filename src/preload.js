const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectRegion: () => ipcRenderer.invoke('select-region'),
  startMonitoring: () => ipcRenderer.invoke('start-monitoring'),
  stopMonitoring: () => ipcRenderer.invoke('stop-monitoring'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  fetchChatId: (token) => ipcRenderer.invoke('fetch-chat-id', token),
  resizeContent: (height) => ipcRenderer.send('resize-content', height),
  onStatusUpdate: (cb) => {
    ipcRenderer.removeAllListeners('status-update');
    ipcRenderer.on('status-update', (_e, data) => cb(data));
  },
  onMonitoringStopped: (cb) => {
    ipcRenderer.removeAllListeners('monitoring-stopped');
    ipcRenderer.on('monitoring-stopped', (_e) => cb());
  },
  onUpdateAvailable: (cb) => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.on('update-available', (_e, data) => cb(data));
  },
  openReleasePage: () => ipcRenderer.send('open-release-page'),
});
