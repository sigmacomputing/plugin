const FPS = 1000 / 60;

/**
 * requestAnimationFrame() calls are paused in most browsers when running in background tabs or hidden <iframe>s in order to improve performance and battery life
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
 */
export function polyfillRequestAnimationFrame(window: Window) {
  if ('requestAnimationFrame' in window) {
    window.requestAnimationFrame = callback => window.setTimeout(callback, FPS);

    window.cancelAnimationFrame = id => window.clearTimeout(id);
  }
}
