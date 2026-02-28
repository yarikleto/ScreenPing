const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const config = require('./config');

let mainWindow;
let overlayWindow = null;
let regionResolve = null;

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

function openOverlay() {
  return new Promise((resolve) => {
    regionResolve = resolve;
    const { screen } = require('electron');
    const display = screen.getPrimaryDisplay();

    overlayWindow = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      fullscreen: true,
      skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, 'overlay-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));
    overlayWindow.on('closed', () => {
      overlayWindow = null;
      if (regionResolve) { regionResolve(null); regionResolve = null; }
    });
  });
}

ipcMain.on('region-selected', (_e, region) => {
  config.set('region', region);
  if (regionResolve) { regionResolve(region); regionResolve = null; }
  if (overlayWindow) { overlayWindow.close(); }
});

ipcMain.on('region-cancelled', () => {
  if (regionResolve) { regionResolve(null); regionResolve = null; }
  if (overlayWindow) { overlayWindow.close(); }
});

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('get-config', () => config.getAll());
  ipcMain.handle('save-config', (_e, cfg) => config.save(cfg));
  ipcMain.handle('select-region', () => openOverlay());
});
app.on('window-all-closed', () => app.quit());
