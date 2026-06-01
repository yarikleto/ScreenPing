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
    console.error(`Telegram API error: ${res.status} ${text}`);
    throw new Error('Internal Server Error');
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
    console.error(`Telegram API error: ${res.status} ${body}`);
    throw new Error('Internal Server Error');
  }
  return res.json();
}

module.exports = { sendPhoto, sendMessage };
