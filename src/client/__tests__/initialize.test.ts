import { initialize } from '../initialize';

describe('initialize', () => {
  let originalAddEventListener: any;
  let originalRemoveEventListener: any;

  beforeAll(() => {
    originalAddEventListener = window.addEventListener;
    originalRemoveEventListener = window.removeEventListener;
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  beforeEach(() => {
    jest.resetAllMocks();
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
