import { validateConfigId } from '../error';

describe('validateConfigId', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('logs a warning when configId is undefined', () => {
    validateConfigId(undefined as unknown as string, 'variable');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('Invalid config variable: undefined');
  });

  it('does not warn for a defined configId', () => {
    validateConfigId('id', 'variable');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not warn for null configId (only undefined triggers a warning)', () => {
    validateConfigId(null as unknown as string, 'variable');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not warn for an empty string configId', () => {
    validateConfigId('', 'variable');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('includes the expectedConfigType in the warning message', () => {
    validateConfigId(undefined as unknown as string, 'element');
    expect(warnSpy).toHaveBeenCalledWith('Invalid config element: undefined');
  });
});
