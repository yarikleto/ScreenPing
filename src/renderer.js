const $ = (id) => document.getElementById(id);

let monitoring = false;

async function loadConfig() {
  const cfg = await window.api.getConfig();
  if (cfg.telegramBotToken) $('token').value = cfg.telegramBotToken;
  if (cfg.telegramChatId) $('chatId').value = cfg.telegramChatId;
  if (cfg.intervalSeconds) $('interval').value = cfg.intervalSeconds;
  if (cfg.thresholdPercent) $('threshold').value = cfg.thresholdPercent;
  if (cfg.region) {
    showRegion(cfg.region);
  }
}

function showRegion(r) {
  const el = $('regionInfo');
  el.textContent = `Region: ${r.x}, ${r.y} — ${r.width}x${r.height}`;
  el.classList.remove('hidden');
}

function addLog(msg, isAlert = false) {
  const el = $('log');
  const entry = document.createElement('div');
  entry.className = 'entry' + (isAlert ? ' alert' : '');
  const time = new Date().toLocaleTimeString();
  entry.textContent = `[${time}] ${msg}`;
  el.prepend(entry);
  while (el.children.length > 50) el.removeChild(el.lastChild);
}

function setMonitoring(active) {
  monitoring = active;
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
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await res.json();
    if (!data.ok) {
      status.textContent = 'Invalid token or API error';
      status.style.color = '#e94560';
      return;
    }
    if (!data.result || data.result.length === 0) {
      status.textContent = 'No messages found — send /start to your bot first, then try again';
      status.style.color = '#ff6b35';
      return;
    }
    const chatId = data.result[data.result.length - 1].message?.chat?.id;
    if (chatId) {
      $('chatId').value = chatId;
      status.textContent = `Found chat ID: ${chatId}`;
      status.style.color = '#2ecc71';
    } else {
      status.textContent = 'Could not find chat ID in response';
      status.style.color = '#e94560';
    }
  } catch (err) {
    status.textContent = 'Network error: ' + err.message;
    status.style.color = '#e94560';
  }
});

function saveFields() {
  window.api.saveConfig({
    telegramBotToken: $('token').value,
    telegramChatId: $('chatId').value,
    intervalSeconds: parseInt($('interval').value, 10) || 10,
    thresholdPercent: parseInt($('threshold').value, 10) || 15,
  });
}

$('token').addEventListener('change', saveFields);
$('chatId').addEventListener('change', saveFields);
$('interval').addEventListener('change', saveFields);
$('threshold').addEventListener('change', saveFields);

$('btnRegion').addEventListener('click', async () => {
  const region = await window.api.selectRegion();
  if (region) showRegion(region);
});

$('btnStart').addEventListener('click', async () => {
  try {
    await window.api.saveConfig({
      telegramBotToken: $('token').value,
      telegramChatId: $('chatId').value,
      intervalSeconds: parseInt($('interval').value, 10),
      thresholdPercent: parseInt($('threshold').value, 10),
    });
    await window.api.startMonitoring();
    setMonitoring(true);
    addLog('Monitoring started');
    $('status').innerHTML = '<div class="line">Monitoring...</div>';
  } catch (err) {
    addLog('Error: ' + err.message, true);
  }
});

$('btnStop').addEventListener('click', async () => {
  await window.api.stopMonitoring();
  setMonitoring(false);
  addLog('Monitoring stopped');
  $('status').innerHTML = '<div class="line">Idle</div>';
});

window.api.onStatusUpdate((data) => {
  $('status').innerHTML = `
    <div class="line">Monitoring... Last check: ${data.lastCheck}</div>
    <div class="line">Diff: ${data.diffPercent.toFixed(1)}%${data.triggered ? ' — TRIGGERED!' : ''}</div>
  `;
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
  $('status').innerHTML = '<div class="line">Idle</div>';
});

loadConfig();
