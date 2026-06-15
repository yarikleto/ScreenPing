const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');

const nodeGlobals = {
  require: 'readonly',
  module: 'writable',
  exports: 'writable',
  process: 'readonly',
  Buffer: 'readonly',
  console: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  // Web APIs available in the Node runtime (>=18).
  fetch: 'readonly',
  FormData: 'readonly',
  Blob: 'readonly',
  URL: 'readonly',
};

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  FormData: 'readonly',
  Blob: 'readonly',
  Image: 'readonly',
  navigator: 'readonly',
  devicePixelRatio: 'readonly',
  console: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
};

module.exports = [
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Main-process / Node + CommonJS files (includes preload scripts).
    files: [
      'src/main.js',
      'src/monitor.js',
      'src/capture.js',
      'src/config.js',
      'src/diff.js',
      'src/telegram.js',
      'src/preload.js',
      'src/overlay-preload.js',
      'test/**/*.js',
      'eslint.config.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
  },
  {
    // Renderer / browser files.
    files: ['src/renderer.js', 'src/overlay.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: browserGlobals,
    },
  },
  prettier,
];
