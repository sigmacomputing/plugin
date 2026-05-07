import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initialize } from '../initialize';

describe('initialize', () => {
  let originalAddEventListener: any;
  let originalRemoveEventListener: any;

  beforeAll(() => {
    originalAddEventListener = window.addEventListener;
    originalRemoveEventListener = window.removeEventListener;
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize and be destroyable', () => {
    const client = initialize();
    expect(window.addEventListener).toHaveBeenCalled();

    client.destroy();
    expect(window.removeEventListener).toHaveBeenCalled();
  });

  afterAll(() => {
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });
});
