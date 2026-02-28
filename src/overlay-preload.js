const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayApi', {
  sendRegion: (region) => ipcRenderer.send('region-selected', region),
  cancel: () => ipcRenderer.send('region-cancelled'),
  onScreenshot: (cb) => ipcRenderer.on('set-screenshot', (_e, dataUrl) => cb(dataUrl)),
});
