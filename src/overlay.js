const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let bgImage = null;
let startX, startY, dragging = false;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (bgImage) drawBg();
}

window.addEventListener('resize', resizeCanvas);

function drawBg() {
  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function draw(x, y, w, h) {
  drawBg();
  // Show original screenshot in selected region
  ctx.drawImage(bgImage, x, y, w, h, x, y, w, h);
  // Border
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  // Size label
  ctx.fillStyle = 'white';
  ctx.font = '14px sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  const labelY = y < 20 ? y + h + 16 : y - 6;
  ctx.fillText(`${w} x ${h}`, x + 4, labelY);
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
  const x = Math.min(startX, e.clientX);
  const y = Math.min(startY, e.clientY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);
  draw(x, y, w, h);
});

canvas.addEventListener('mouseup', (e) => {
  if (!dragging) return;
  dragging = false;
  const x = Math.round(Math.min(startX, e.clientX) * window.devicePixelRatio);
  const y = Math.round(Math.min(startY, e.clientY) * window.devicePixelRatio);
  const w = Math.round(Math.abs(e.clientX - startX) * window.devicePixelRatio);
  const h = Math.round(Math.abs(e.clientY - startY) * window.devicePixelRatio);
  if (w > 10 && h > 10) {
    window.overlayApi.sendRegion({ x, y, width: w, height: h });
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.overlayApi.cancel();
});
