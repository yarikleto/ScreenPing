const $ = (id) => document.getElementById(id);

const MAX_LOG_ENTRIES = 50;

async function loadConfig() {
  const cfg = await window.api.getConfig();
  if (cfg.telegramBotToken) $('token').value = cfg.telegramBotToken;
  if (cfg.telegramChatId) $('chatId').value = cfg.telegramChatId;
  if (cfg.intervalSeconds) $('interval').value = cfg.intervalSeconds;
  if (cfg.thresholdPercent) $('threshold').value = cfg.thresholdPercent;
  if (cfg.region) {
    showRegion(cfg.region, cfg.regionPreview);
  }
  // Setup is a one-time chore: collapse it once credentials exist, expand it
  // (so it's the first thing seen) when they don't.
  const configured = !!(cfg.telegramBotToken && cfg.telegramChatId);
  $('settings').open = !configured;
  refreshSettingsState();
}

function refreshSettingsState() {
  const configured = $('token').value.trim() !== '' && $('chatId').value.trim() !== '';
  $('settingsState').textContent = configured ? '· configured' : '· needs setup';
}

function showRegion(r, preview) {
  const el = $('regionInfo');
  el.textContent = '';

  if (preview) {
    const img = document.createElement('img');
    img.className = 'region-preview';
    img.src = preview;
    img.alt = 'Selected region preview';
    img.addEventListener('load', scheduleResize);
    el.appendChild(img);
  }

  const caption = document.createElement('div');
  caption.className = 'region-caption';
  caption.textContent = `${r.width} × ${r.height} at ${r.x}, ${r.y}`;
  el.appendChild(caption);

  el.classList.remove('hidden');
}

function addLog(msg, isAlert = false) {
  const el = $('log');
  const entry = document.createElement('div');
  entry.className = 'entry' + (isAlert ? ' alert' : '');
  const time = new Date().toLocaleTimeString();
  entry.textContent = `[${time}] ${msg}`;
  el.prepend(entry);
  while (el.children.length > MAX_LOG_ENTRIES) el.removeChild(el.lastChild);
}

function setStatus(...lines) {
  const el = $('status');
  el.textContent = '';
  for (const text of lines) {
    const line = document.createElement('div');
    line.className = 'line';
    line.textContent = text;
    el.appendChild(line);
  }
}

function setMonitoring(active) {
  $('btnStart').classList.toggle('hidden', active);
  $('btnStop').classList.toggle('hidden', !active);
  $('token').disabled = active;
  $('chatId').disabled = active;
  $('interval').disabled = active;
  $('threshold').disabled = active;
  $('btnRegion').disabled = active;
}

$('btnFetchChatId').addEventListener('click', async () => {
  const token = $('token').value.trim();
  const status = $('fetchStatus');
  if (!token) {
    status.textContent = 'Enter bot token first';
    status.style.color = '#e94560';
    return;
  }
  status.textContent = 'Fetching...';
  status.style.color = '#aaa';
  try {
    const chatId = await window.api.fetchChatId(token);
    $('chatId').value = chatId;
    saveFields();
    refreshSettingsState();
    status.textContent = `Found chat ID: ${chatId}`;
    status.style.color = '#2ecc71';
  } catch (err) {
    status.textContent = err.message;
    status.style.color = '#e94560';
  }
});

function readFields() {
  return {
    telegramBotToken: $('token').value,
    telegramChatId: $('chatId').value,
    intervalSeconds: parseInt($('interval').value, 10) || 10,
    thresholdPercent: parseInt($('threshold').value, 10) || 1,
  };
}

function saveFields() {
  window.api.saveConfig(readFields());
}

$('token').addEventListener('input', refreshSettingsState);
$('chatId').addEventListener('input', refreshSettingsState);
$('token').addEventListener('change', saveFields);
$('chatId').addEventListener('change', saveFields);
$('interval').addEventListener('change', saveFields);
$('threshold').addEventListener('change', saveFields);

$('btnRegion').addEventListener('click', async () => {
  const result = await window.api.selectRegion();
  if (result && result.region) showRegion(result.region, result.preview);
});

$('btnStart').addEventListener('click', async () => {
  try {
    await window.api.saveConfig(readFields());
    await window.api.startMonitoring();
    setMonitoring(true);
    addLog('Monitoring started');
    setStatus('Monitoring...');
  } catch (err) {
    addLog('Error: ' + err.message, true);
  }
});

$('btnStop').addEventListener('click', async () => {
  await window.api.stopMonitoring();
  setMonitoring(false);
  addLog('Monitoring stopped');
  setStatus('Idle');
});

window.api.onStatusUpdate((data) => {
  setStatus(
    `Monitoring... Last check: ${data.lastCheck}`,
    `Diff: ${data.diffPercent.toFixed(1)}%${data.triggered ? ' — TRIGGERED!' : ''}`
  );
  if (data.notified) {
    addLog(`Change detected! Diff: ${data.diffPercent.toFixed(1)}% — Telegram sent`, true);
  } else if (data.triggered) {
    addLog(`Change detected! Diff: ${data.diffPercent.toFixed(1)}% — Telegram FAILED`, true);
  } else {
    addLog(`Check: diff ${data.diffPercent.toFixed(1)}%`);
  }
});

window.api.onMonitoringStopped(() => {
  setMonitoring(false);
  addLog('Monitoring stopped (hotkey)');
  setStatus('Idle');
});

window.api.onUpdateAvailable((info) => {
  $('updateText').textContent = `Version ${info.version} is available`;
  $('updateBanner').classList.remove('hidden');
});
$('btnUpdate').addEventListener('click', () => window.api.openReleasePage());
$('btnDismissUpdate').addEventListener('click', () => {
  $('updateBanner').classList.add('hidden');
});

// Keep the native window sized to its rendered content (macOS-style fit):
// measure the real DOM and ask main to match it whenever the layout changes.
function reportContentHeight() {
  if (!window.api.resizeContent) return;
  const titlebar = document.querySelector('.titlebar');
  const inner = document.querySelector('.inner');
  if (!inner) return;
  const height =
    (titlebar ? titlebar.offsetHeight : 0) + Math.ceil(inner.getBoundingClientRect().height);
  window.api.resizeContent(height);
}

let resizePending = false;
function scheduleResize() {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    reportContentHeight();
  });
}

const innerEl = document.querySelector('.inner');
if (innerEl && 'ResizeObserver' in window) {
  new ResizeObserver(scheduleResize).observe(innerEl);
}
window.addEventListener('load', scheduleResize);

loadConfig();
