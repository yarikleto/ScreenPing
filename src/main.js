const { app, BrowserWindow, ipcMain, globalShortcut, Notification } = require('electron');
const path = require('path');
const config = require('./config');
const { Monitor } = require('./monitor');

let monitor = null;

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

  ipcMain.handle('start-monitoring', () => {
    const cfg = config.getAll();
    if (!cfg.region) throw new Error('No region selected');
    if (!cfg.telegramBotToken || !cfg.telegramChatId) throw new Error('Telegram not configured');

    monitor = new Monitor({
      ...cfg,
      onStatus: (status) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('status-update', status);
        }
      },
    });
    monitor.start();
  });

  ipcMain.handle('stop-monitoring', () => {
    if (monitor) {
      monitor.stop();
      monitor = null;
    }
  });

  globalShortcut.register('Ctrl+Shift+Space', () => {
    if (monitor && monitor.running) {
      monitor.stop();
      monitor = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('monitoring-stopped');
      }
      new Notification({ title: 'TML Monitor', body: 'Monitoring stopped' }).show();
    } else {
      try {
        const cfg = config.getAll();
        if (!cfg.region || !cfg.telegramBotToken || !cfg.telegramChatId) return;
        monitor = new Monitor({
          ...cfg,
          onStatus: (status) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('status-update', status);
            }
          },
        });
        monitor.start();
        new Notification({ title: 'TML Monitor', body: 'Monitoring started' }).show();
      } catch (err) {
        console.error('Failed to start monitoring:', err);
      }
    }
  });
});
app.on('window-all-closed', () => app.quit());

app.on('before-quit', () => {
  if (monitor) { monitor.stop(); monitor = null; }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
