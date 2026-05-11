import { polyfillRequestAnimationFrame } from '../polyfillRequestAnimationFrame';

describe('polyfillRequestAnimationFrame', () => {
  it('replaces requestAnimationFrame with a setTimeout-based polyfill', () => {
    const setTimeoutSpy = vi.fn(() => 42 as unknown as ReturnType<typeof setTimeout>);
    const clearTimeoutSpy = vi.fn();
    const fakeWindow = {
      requestAnimationFrame: () => 0,
      cancelAnimationFrame: () => {},
      setTimeout: setTimeoutSpy,
      clearTimeout: clearTimeoutSpy,
    } as unknown as Window;

    polyfillRequestAnimationFrame(fakeWindow);

    const cb = vi.fn();
    const handle = fakeWindow.requestAnimationFrame(cb);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(cb, 1000 / 60);
    expect(handle).toBe(42);
  });

  it('replaces cancelAnimationFrame to delegate to clearTimeout', () => {
    const setTimeoutSpy = vi.fn();
    const clearTimeoutSpy = vi.fn();
    const fakeWindow = {
      requestAnimationFrame: () => 0,
      cancelAnimationFrame: () => {},
      setTimeout: setTimeoutSpy,
      clearTimeout: clearTimeoutSpy,
    } as unknown as Window;

    polyfillRequestAnimationFrame(fakeWindow);

    fakeWindow.cancelAnimationFrame(99);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(99);
  });

  it('is a no-op when requestAnimationFrame is not present on the window', () => {
    const fakeWindow = {
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
    } as unknown as Window;

    polyfillRequestAnimationFrame(fakeWindow);

    expect((fakeWindow as any).requestAnimationFrame).toBeUndefined();
    expect((fakeWindow as any).cancelAnimationFrame).toBeUndefined();
  });

  it('polyfills the real window without throwing', () => {
    expect(() => polyfillRequestAnimationFrame(window)).not.toThrow();
    expect(typeof window.requestAnimationFrame).toBe('function');
    expect(typeof window.cancelAnimationFrame).toBe('function');
  });
});
