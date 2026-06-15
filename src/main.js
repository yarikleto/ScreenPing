const { app, BrowserWindow, ipcMain, globalShortcut, Notification, screen } = require('electron');
const path = require('path');
const config = require('./config');
const { Monitor } = require('./monitor');
const { captureScreen } = require('./capture');
const { getChatId } = require('./telegram');

let monitor = null;
let mainWindow = null;
let overlayWindow = null;
let regionResolve = null;
let isSelectingRegion = false;

const isMac = process.platform === 'darwin';

let mainWindowShown = false;

// Reveal the main window exactly once. Called after the first content
// measurement so the window opens already sized to its content (no resize jump).
function showMainWindow() {
  if (mainWindowShown || !mainWindow || mainWindow.isDestroyed()) return;
  mainWindowShown = true;
  mainWindow.show();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    // Close to the real content height; the renderer fine-tunes it on load via
    // the 'resize-content' IPC so the window always hugs its content.
    height: 760,
    resizable: false,
    show: false,
    // macOS "glass" look: native vibrancy + inset traffic lights.
    // All of these are mac-only and ignored/undefined elsewhere.
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 14 } : undefined,
    vibrancy: isMac ? 'under-window' : undefined,
    visualEffectState: 'active',
    // Transparent on mac so the vibrancy material shows through; solid base elsewhere.
    backgroundColor: isMac ? '#00000000' : '#15152a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // The renderer measures its content and triggers showMainWindow() via the
  // 'resize-content' IPC. This fallback guarantees the window still appears if
  // that measurement never arrives (and avoids a white flash before paint).
  mainWindow.once('ready-to-show', () => setTimeout(showMainWindow, 700));
  mainWindow.on('closed', () => { mainWindow = null; });
}

async function openOverlay() {
  const display = screen.getPrimaryDisplay();

  // Capture at physical resolution — the real screen pixels
  const thumbnail = await captureScreen();
  const screenshotDataUrl = thumbnail.toDataURL();

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

async function startMonitor() {
  const cfg = config.getAll();
  if (!cfg.region) throw new Error('No region selected');
  if (!cfg.telegramBotToken || !cfg.telegramChatId) throw new Error('Telegram not configured');

  monitor = new Monitor({
    ...cfg,
    onStatus: createMonitorStatusHandler(),
  });
  await monitor.start();
}

function stopMonitor() {
  if (monitor) {
    monitor.stop();
    monitor = null;
  }
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('get-config', () => config.getAll());
  ipcMain.handle('save-config', (_e, cfg) => config.save(cfg));
  ipcMain.handle('select-region', () => openOverlay());
  ipcMain.handle('fetch-chat-id', (_e, token) => getChatId(token));

  // Keep the window height matched to its content (clamped to the screen).
  // setContentSize can be ignored while resizable:false on some Electron
  // versions, so briefly re-enable resizing around the call.
  ipcMain.on('resize-content', (_e, height) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const maxHeight = screen.getPrimaryDisplay().workAreaSize.height - 40;
    const target = Math.max(360, Math.min(Math.round(height) || 0, maxHeight));
    const [width, current] = mainWindow.getContentSize();
    if (current !== target) {
      const wasResizable = mainWindow.isResizable();
      if (!wasResizable) mainWindow.setResizable(true);
      mainWindow.setContentSize(width, target);
      if (!wasResizable) mainWindow.setResizable(false);
    }
    showMainWindow();
  });

  ipcMain.handle('start-monitoring', async () => {
    await startMonitor();
  });

  ipcMain.handle('stop-monitoring', () => {
    stopMonitor();
  });

  const registered = globalShortcut.register('Ctrl+Shift+Space', () => {
    if (monitor && monitor.running) {
      stopMonitor();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('monitoring-stopped');
      }
      new Notification({ title: 'ScreenPing', body: 'Monitoring stopped' }).show();
    } else {
      startMonitor()
        .then(() => {
          new Notification({ title: 'ScreenPing', body: 'Monitoring started' }).show();
        })
        .catch((err) => {
          console.error('Failed to start monitoring:', err);
        });
    }
  });
  if (!registered) {
    console.warn('Failed to register global shortcut Ctrl+Shift+Space (may be in use)');
  }
});

app.on('window-all-closed', () => {
  if (isSelectingRegion) return;
  app.quit();
});

app.on('before-quit', () => {
  stopMonitor();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
