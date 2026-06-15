const { captureScreen, cropRegion, toRGBA } = require('./capture');
const { computeDiff } = require('./diff');
const { sendPhoto } = require('./telegram');

class Monitor {
  constructor({ region, intervalSeconds, thresholdPercent, telegramBotToken, telegramChatId, onStatus }) {
    this.region = region;
    this.interval = Math.max(1, Number(intervalSeconds) || 10) * 1000;
    this.threshold = Number.isFinite(Number(thresholdPercent)) && Number(thresholdPercent) > 0
      ? Number(thresholdPercent)
      : 1;
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
    this.scheduleNext();
  }

  scheduleNext() {
    if (!this.running) return;
    this.timer = setTimeout(async () => {
      await this.tick();
      this.scheduleNext();
    }, this.interval);
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
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

      if (!this.prevImage) {
        this.prevImage = { data, width, height };
        this.onStatus({ lastCheck: new Date().toLocaleTimeString(), diffPercent: 0, triggered: false, notified: false });
        return;
      }

      // Handle size mismatch (e.g. resolution change)
      if (this.prevImage.width !== width || this.prevImage.height !== height) {
        this.prevImage = { data, width, height };
        this.onStatus({ lastCheck: new Date().toLocaleTimeString(), diffPercent: 0, triggered: false, notified: false });
        return;
      }

      const diffPercent = computeDiff(this.prevImage.data, data, width, height);
      const triggered = diffPercent > this.threshold;
      let notified = false;

      if (triggered) {
        try {
          const pngBuffer = cropped.toPNG();
          await sendPhoto(
            this.token,
            this.chatId,
            pngBuffer,
            `Screen changed! Diff: ${diffPercent.toFixed(1)}%`
          );
          notified = true;
        } catch (err) {
          console.error('Telegram send failed:', err.message);
        }
      }

      this.onStatus({
        lastCheck: new Date().toLocaleTimeString(),
        diffPercent,
        triggered,
        notified,
      });

      this.prevImage = { data, width, height };
    } catch (err) {
      console.error('Monitor tick error:', err.message);
    }
  }
}

module.exports = { Monitor };
