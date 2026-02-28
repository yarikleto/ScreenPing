const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const config = require('./config');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('get-config', () => config.getAll());
  ipcMain.handle('save-config', (_e, cfg) => config.save(cfg));
});
app.on('window-all-closed', () => app.quit());
