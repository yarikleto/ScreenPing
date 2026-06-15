const { test } = require('node:test');
const assert = require('node:assert');
const { computeDiff } = require('../src/diff');

// Helper: build an RGBA buffer of width*height filled with a single color.
function solid(width, height, [r, g, b, a]) {
  const buf = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    buf[i * 4 + 0] = r;
    buf[i * 4 + 1] = g;
    buf[i * 4 + 2] = b;
    buf[i * 4 + 3] = a;
  }
  return buf;
}

test('identical buffers produce 0% diff', () => {
  const a = solid(4, 4, [10, 20, 30, 255]);
  const b = solid(4, 4, [10, 20, 30, 255]);
  assert.strictEqual(computeDiff(a, b, 4, 4), 0);
});

test('fully different buffers produce ~100% diff', () => {
  const a = solid(4, 4, [0, 0, 0, 255]);
  const b = solid(4, 4, [255, 255, 255, 255]);
  const pct = computeDiff(a, b, 4, 4);
  assert.ok(pct >= 99 && pct <= 100, `expected ~100%, got ${pct}`);
});

test('a single changed pixel in a 2x2 image is ~25%', () => {
  const a = solid(2, 2, [0, 0, 0, 255]);
  const b = solid(2, 2, [0, 0, 0, 255]);
  // Change one of the four pixels to white.
  b[0] = 255;
  b[1] = 255;
  b[2] = 255;
  const pct = computeDiff(a, b, 2, 2);
  assert.ok(pct > 0, `expected >0%, got ${pct}`);
  assert.ok(pct <= 25, `expected at most 25%, got ${pct}`);
});

test('a small changed region yields a small percentage', () => {
  const a = solid(4, 4, [0, 0, 0, 255]);
  const b = solid(4, 4, [0, 0, 0, 255]);
  // Change one pixel out of 16 => ~6.25%.
  b[0] = 255;
  b[1] = 255;
  b[2] = 255;
  const pct = computeDiff(a, b, 4, 4);
  assert.ok(pct > 0 && pct < 20, `expected a small percentage, got ${pct}`);
});
