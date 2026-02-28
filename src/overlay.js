const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;

let bgImage = null;
let startX, startY, dragging = false;

// Canvas internal bitmap at physical resolution, CSS stretches to fill screen
function resizeCanvas() {
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  if (bgImage) drawBg();
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function drawBg() {
  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function draw(cx, cy, cw, ch) {
  // Convert CSS coords to physical canvas coords
  const x = cx * dpr;
  const y = cy * dpr;
  const w = cw * dpr;
  const h = ch * dpr;

  drawBg();
  ctx.drawImage(bgImage, x, y, w, h, x, y, w, h);
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2 * dpr;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = 'white';
  ctx.font = `${14 * dpr}px sans-serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4 * dpr;
  const labelY = y < 20 * dpr ? y + h + 16 * dpr : y - 6 * dpr;
  ctx.fillText(`${Math.round(w)} x ${Math.round(h)}`, x + 4 * dpr, labelY);
  ctx.shadowBlur = 0;
}

window.overlayApi.onScreenshot((dataUrl) => {
  bgImage = new Image();
  bgImage.onload = () => resizeCanvas();
  bgImage.src = dataUrl;
});

canvas.addEventListener('mousedown', (e) => {
  startX = e.clientX;
  startY = e.clientY;
  dragging = true;
});

canvas.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  draw(
    Math.min(startX, e.clientX),
    Math.min(startY, e.clientY),
    Math.abs(e.clientX - startX),
    Math.abs(e.clientY - startY)
  );
});

canvas.addEventListener('mouseup', (e) => {
  if (!dragging) return;
  dragging = false;
  // Send physical pixel coordinates to match captureScreen resolution
  const x = Math.round(Math.min(startX, e.clientX) * dpr);
  const y = Math.round(Math.min(startY, e.clientY) * dpr);
  const w = Math.round(Math.abs(e.clientX - startX) * dpr);
  const h = Math.round(Math.abs(e.clientY - startY) * dpr);
  if (w > 10 && h > 10) {
    window.overlayApi.sendRegion({ x, y, width: w, height: h });
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.overlayApi.cancel();
});
