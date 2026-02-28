const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayApi', {
  sendRegion: (region) => ipcRenderer.send('region-selected', region),
  cancel: () => ipcRenderer.send('region-cancelled'),
});
