const Store = require('electron-store');

const store = new Store({
  defaults: {
    telegramBotToken: '',
    telegramChatId: '',
    intervalSeconds: 10,
    thresholdPercent: 1,
    region: null,
    regionPreview: null,
  },
});

module.exports = {
  getAll() {
    return {
      telegramBotToken: store.get('telegramBotToken'),
      telegramChatId: store.get('telegramChatId'),
      intervalSeconds: store.get('intervalSeconds'),
      thresholdPercent: store.get('thresholdPercent'),
      region: store.get('region'),
      regionPreview: store.get('regionPreview'),
    };
  },
  save(cfg) {
    store.set(cfg);
  },
  get(key) {
    return store.get(key);
  },
  set(key, value) {
    store.set(key, value);
  },
};
