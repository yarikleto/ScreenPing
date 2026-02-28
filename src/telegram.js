async function sendPhoto(token, chatId, pngBuffer, caption) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption);
  formData.append('photo', new Blob([pngBuffer], { type: 'image/png' }), 'screenshot.png');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram API error: ${res.status} ${text}`);
  }
  return res.json();
}

async function sendMessage(token, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error: ${res.status} ${body}`);
  }
  return res.json();
}

module.exports = { sendPhoto, sendMessage };
