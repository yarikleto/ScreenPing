const { test } = require('node:test');
const assert = require('node:assert');
const { isNewer } = require('../src/update-check');

test('a higher patch/minor/major is newer', () => {
  assert.strictEqual(isNewer('1.0.3', '1.0.2'), true);
  assert.strictEqual(isNewer('1.1.0', '1.0.9'), true);
  assert.strictEqual(isNewer('2.0.0', '1.9.9'), true);
});

test('equal or older versions are not newer', () => {
  assert.strictEqual(isNewer('1.0.2', '1.0.2'), false);
  assert.strictEqual(isNewer('1.0.1', '1.0.2'), false);
  assert.strictEqual(isNewer('1.0.0', '2.0.0'), false);
});

test('a leading "v" on either side is tolerated', () => {
  assert.strictEqual(isNewer('v1.0.3', '1.0.2'), true);
  assert.strictEqual(isNewer('v1.0.2', 'v1.0.2'), false);
});

test('missing minor/patch components default to 0', () => {
  assert.strictEqual(isNewer('1.1', '1.0.5'), true);
  assert.strictEqual(isNewer('1', '1.0.0'), false);
});
