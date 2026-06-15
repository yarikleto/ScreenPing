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
    throw new Error(`Telegram API error: ${res.status} ${text}`);
  }
  return res.json();
}

async function getChatId(token) {
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const data = await res.json();
  if (!data.ok) {
    throw new Error('Invalid token or Telegram API error');
  }
  if (!data.result || data.result.length === 0) {
    throw new Error('No messages found — send /start to your bot first, then try again');
  }
  const chatId = data.result[data.result.length - 1].message?.chat?.id;
  if (!chatId) {
    throw new Error('Could not find chat ID in response');
  }
  return chatId;
}

module.exports = { sendPhoto, getChatId };
