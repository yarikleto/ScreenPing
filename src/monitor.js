const { captureScreen, cropRegion, toRGBA } = require('./capture');
const { computeDiff } = require('./diff');
const { sendPhoto } = require('./telegram');

class Monitor {
  constructor({ region, intervalSeconds, thresholdPercent, telegramBotToken, telegramChatId, onStatus }) {
    this.region = region;
    this.interval = intervalSeconds * 1000;
    this.threshold = thresholdPercent;
    this.token = telegramBotToken;
    this.chatId = telegramChatId;
    this.onStatus = onStatus;
    this.prevImage = null;
    this.timer = null;
    this.running = false;
  }

  async start() {
    this.running = true;
    await this.tick();
    this.timer = setInterval(() => this.tick(), this.interval);
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.prevImage = null;
  }

  async tick() {
    if (!this.running) return;
    try {
      const screenshot = await captureScreen();
      const cropped = cropRegion(screenshot, this.region);
      const { data, width, height } = toRGBA(cropped);
      const pngBuffer = cropped.toPNG();

      if (!this.prevImage) {
        this.prevImage = { data, width, height };
        this.onStatus({ lastCheck: new Date().toLocaleTimeString(), diffPercent: 0, triggered: false });
        return;
      }

      // Handle size mismatch (e.g. resolution change)
      if (this.prevImage.width !== width || this.prevImage.height !== height) {
        this.prevImage = { data, width, height };
        this.onStatus({ lastCheck: new Date().toLocaleTimeString(), diffPercent: 0, triggered: false });
        return;
      }

      const diffPercent = computeDiff(this.prevImage.data, data, width, height);
      const triggered = diffPercent > this.threshold;

      if (triggered) {
        try {
          await sendPhoto(
            this.token,
            this.chatId,
            pngBuffer,
            `Screen changed! Diff: ${diffPercent.toFixed(1)}%`
          );
        } catch (err) {
          console.error('Telegram send failed:', err.message);
        }
      }

      this.onStatus({
        lastCheck: new Date().toLocaleTimeString(),
        diffPercent,
        triggered,
      });

      this.prevImage = { data, width, height };
    } catch (err) {
      console.error('Monitor tick error:', err.message);
    }
  }
}

module.exports = { Monitor };
