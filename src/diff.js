const pixelmatch = require('pixelmatch');

function computeDiff(prev, current, width, height) {
  const totalPixels = width * height;
  const numDiff = pixelmatch(prev, current, null, width, height, {
    threshold: 0.1,
  });
  return (numDiff / totalPixels) * 100;
}

module.exports = { computeDiff };
