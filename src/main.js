const { app, BrowserWindow, ipcMain, globalShortcut, Notification } = require('electron');
const path = require('path');
const config = require('./config');
const { Monitor } = require('./monitor');

let monitor = null;
let mainWindow;
let overlayWindow = null;
let regionResolve = null;
let isSelectingRegion = false;

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

async function openOverlay() {
  const { screen, desktopCapturer } = require('electron');
  const display = screen.getPrimaryDisplay();
  const scaleFactor = display.scaleFactor || 1;
  const physWidth = Math.round(display.size.width * scaleFactor);
  const physHeight = Math.round(display.size.height * scaleFactor);

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: physWidth, height: physHeight },
  });
  const screenshotDataUrl = sources[0].thumbnail.toDataURL();

  isSelectingRegion = true;
  mainWindow.hide();

  return new Promise((resolve) => {
    regionResolve = resolve;

    overlayWindow = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      fullscreen: true,
      webPreferences: {
        preload: path.join(__dirname, 'overlay-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));
    overlayWindow.webContents.on('did-finish-load', () => {
      overlayWindow.webContents.send('set-screenshot', screenshotDataUrl);
    });
    overlayWindow.on('closed', () => {
      overlayWindow = null;
      if (regionResolve) { regionResolve(null); regionResolve = null; }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
      isSelectingRegion = false;
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

function createMonitorStatusHandler() {
  return (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-update', status);
    }
  };
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('get-config', () => config.getAll());
  ipcMain.handle('save-config', (_e, cfg) => config.save(cfg));
  ipcMain.handle('select-region', () => openOverlay());

  ipcMain.handle('start-monitoring', async () => {
    const cfg = config.getAll();
    if (!cfg.region) throw new Error('No region selected');
    if (!cfg.telegramBotToken || !cfg.telegramChatId) throw new Error('Telegram not configured');

    monitor = new Monitor({
      ...cfg,
      onStatus: createMonitorStatusHandler(),
    });
    await monitor.start();
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
      new Notification({ title: 'ScreenPing', body: 'Monitoring stopped' }).show();
    } else {
      const cfg = config.getAll();
      if (!cfg.region || !cfg.telegramBotToken || !cfg.telegramChatId) return;
      monitor = new Monitor({
        ...cfg,
        onStatus: createMonitorStatusHandler(),
      });
      monitor.start().catch((err) => {
        console.error('Failed to start monitoring:', err);
      });
      new Notification({ title: 'ScreenPing', body: 'Monitoring started' }).show();
    }
  });
});

app.on('window-all-closed', () => {
  if (isSelectingRegion) return;
  app.quit();
});

app.on('before-quit', () => {
  if (monitor) { monitor.stop(); monitor = null; }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
