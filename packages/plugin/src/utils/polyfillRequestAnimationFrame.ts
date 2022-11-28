/**
 * requestAnimationFrame() calls are paused in most browsers when running in background tabs or hidden <iframe>s in order to improve performance and battery life
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
 * @param w Window Object
 */
export function polyfillRequestAnimationFrame(window: Window) {
  if ('requestAnimationFrame' in window) {
    window.requestAnimationFrame = (handler: TimerHandler): number =>
      window.setTimeout(handler, 1000 / 60);
    window.cancelAnimationFrame = (id?: number) => window.clearTimeout(id);
  }
}
