const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let startX, startY, dragging = false;

function draw(x, y, w, h) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Dim everything
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Clear selected region
  ctx.clearRect(x, y, w, h);
  // Border
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  // Size label
  ctx.fillStyle = 'white';
  ctx.font = '14px sans-serif';
  ctx.fillText(`${Math.abs(w)} x ${Math.abs(h)}`, x + 4, y - 6);
}

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
