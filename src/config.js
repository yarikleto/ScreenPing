const Store = require('electron-store');

const store = new Store({
  defaults: {
    telegramBotToken: '',
    telegramChatId: '',
    intervalSeconds: 10,
    thresholdPercent: 1,
    region: null,
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
    };
  },
  save(cfg) {
    for (const [key, value] of Object.entries(cfg)) {
      store.set(key, value);
    }
  },
  get(key) {
    return store.get(key);
  },
  set(key, value) {
    store.set(key, value);
  },
};
