const { app, BrowserWindow, ipcMain, globalShortcut, Notification, screen, shell, dialog } = require('electron');
const path = require('path');
const config = require('./config');
const { Monitor } = require('./monitor');
const { captureScreen } = require('./capture');
const { getChatId } = require('./telegram');
const { checkForUpdate } = require('./update-check');

let monitor = null;
let mainWindow = null;
let overlayWindow = null;
let regionResolve = null;
let isSelectingRegion = false;
// The full-screen capture taken for the most recent region selection. Kept so
// we can crop a small preview thumbnail once the user confirms their region.
let lastScreenshot = null;
// Set when a newer release is found; the renderer's "Update" button opens it.
let updateUrl = null;

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
    // Fixed 16:9 landscape desktop window. Content area drives the size so the
    // in-page titlebar is included in the 960×540 box.
    width: 960,
    height: 540,
    useContentSize: true,
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

  // Once the renderer is ready, check GitHub for a newer release and, if there
  // is one, tell the renderer to show its update banner. Best-effort and silent.
  mainWindow.webContents.once('did-finish-load', () => {
    checkForUpdate(app.getVersion()).then((update) => {
      if (update && mainWindow && !mainWindow.isDestroyed()) {
        updateUrl = update.url;
        mainWindow.webContents.send('update-available', { version: update.version });
      }
    });
  });
}

// Open the latest-release page in the user's browser (URL is set by the update check).
ipcMain.on('open-release-page', () => {
  if (updateUrl) shell.openExternal(updateUrl);
});

// desktopCapturer.getSources() rejects with "Failed to get sources" when the app
// lacks macOS Screen Recording permission. Surface that instead of failing silently.
function notifyScreenCaptureBlocked(err) {
  if (isMac) {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      title: 'Screen Recording permission needed',
      message: 'ScreenPing can’t capture your screen.',
      detail:
        'Grant Screen Recording permission in System Settings → Privacy & Security → ' +
        'Screen Recording, enable ScreenPing, then try selecting a region again. ' +
        'You may need to quit and reopen ScreenPing after enabling it.',
      buttons: ['Open System Settings', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
    });
    if (choice === 0) {
      shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      );
    }
  } else {
    dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      title: 'Screen capture failed',
      message: 'ScreenPing could not capture your screen.',
      detail: err.message,
      buttons: ['OK'],
    });
  }
}

async function openOverlay() {
  const display = screen.getPrimaryDisplay();

  // Capture at physical resolution — the real screen pixels
  let thumbnail;
  try {
    thumbnail = await captureScreen();
  } catch (err) {
    notifyScreenCaptureBlocked(err);
    return null;
  }
  lastScreenshot = thumbnail;
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
      // macOS native fullscreen insets the content area by the menu bar, so the
      // window no longer matches the full-screen screenshot 1:1 (causing the
      // overlay to look zoomed/shifted). Instead, on mac we cover the whole
      // display with explicit bounds and float above the menu bar/Dock via the
      // screen-saver window level (set below). Other platforms keep fullscreen.
      fullscreen: !isMac,
      enableLargerThanScreen: isMac,
      webPreferences: {
        preload: path.join(__dirname, 'overlay-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    if (isMac) {
      overlayWindow.setAlwaysOnTop(true, 'screen-saver');
      overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      overlayWindow.setBounds({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
      });
    }
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

// Crop the last full-screen capture down to the selected region and shrink it
// to a small thumbnail so the UI can show what's being watched. Returns a data
// URL, or null if no screenshot is available / the region is out of bounds.
function buildRegionPreview(region) {
  if (!lastScreenshot) return null;
  try {
    const cropped = lastScreenshot.crop(region);
    const { width, height } = cropped.getSize();
    if (!width || !height) return null;
    const maxW = 800;
    const maxH = 480;
    const scale = Math.min(maxW / width, maxH / height, 1);
    const resized = cropped.resize({
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
      quality: 'good',
    });
    return resized.toDataURL();
  } catch {
    return null;
  }
}

ipcMain.on('region-selected', (_e, region) => {
  config.set('region', region);
  const preview = buildRegionPreview(region);
  config.set('regionPreview', preview);
  if (regionResolve) { regionResolve({ region, preview }); regionResolve = null; }
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

  // The window is a fixed 16:9 box, so we no longer resize to content — the
  // renderer just uses this signal to reveal the window once it has painted.
  ipcMain.on('resize-content', () => {
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
