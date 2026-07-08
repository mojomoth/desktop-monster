// Renderer stub — paints a single test pixel on the canvas.
// The full scene/HUD boot lands in T13.

const canvas = document.getElementById('game');
if (canvas instanceof HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, 1, 1);
  }
}

export {};
