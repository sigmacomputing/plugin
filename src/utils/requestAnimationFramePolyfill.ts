export function polyfillRequestAnimationFrame() {
  window.requestAnimationFrame = cb => window.setTimeout(cb, 1000 / 60);
  window.cancelAnimationFrame = id => window.clearTimeout(id);
}