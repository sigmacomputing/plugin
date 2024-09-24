/**
 * requestAnimationFrame() calls are paused in most browsers when running in background tabs or hidden <iframe>s in order to improve performance and battery life
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
 * @param w Window Object
 */
export function polyfillRequestAnimationFrame(w: Window) {
  if ('requestAnimationFrame' in w) {
    w.requestAnimationFrame = cb => w.setTimeout(cb, 1000 / 60);
    w.cancelAnimationFrame = id => w.clearTimeout(id);
  }
}
