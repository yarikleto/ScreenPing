const { desktopCapturer } = require('electron');

async function captureScreen() {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 3840, height: 2160 },
  });
  if (sources.length === 0) throw new Error('No screen source found');
  return sources[0].thumbnail; // NativeImage
}

function cropRegion(nativeImage, region) {
  return nativeImage.crop(region);
}

function toRGBA(nativeImage) {
  const bitmap = nativeImage.toBitmap();
  const size = nativeImage.getSize();
  // Electron bitmap is BGRA, convert to RGBA
  const rgba = Buffer.alloc(bitmap.length);
  for (let i = 0; i < bitmap.length; i += 4) {
    rgba[i] = bitmap[i + 2];     // R <- B
    rgba[i + 1] = bitmap[i + 1]; // G
    rgba[i + 2] = bitmap[i];     // B <- R
    rgba[i + 3] = bitmap[i + 3]; // A
  }
  return { data: rgba, width: size.width, height: size.height };
}

module.exports = { captureScreen, cropRegion, toRGBA };
