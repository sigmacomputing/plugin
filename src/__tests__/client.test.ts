import { client } from '../client';

describe('client', () => {
  it('exports a singleton plugin instance', () => {
    expect(client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.elements).toBeDefined();
    expect(client.style).toBeDefined();
    expect(typeof client.destroy).toBe('function');
  });

  it('exposes the documented config methods', () => {
    expect(typeof client.config.get).toBe('function');
    expect(typeof client.config.set).toBe('function');
    expect(typeof client.config.subscribe).toBe('function');
    expect(typeof client.config.getVariable).toBe('function');
    expect(typeof client.config.setVariable).toBe('function');
    expect(typeof client.config.subscribeToWorkbookVariable).toBe('function');
    expect(typeof client.config.getInteraction).toBe('function');
    expect(typeof client.config.setInteraction).toBe('function');
    expect(typeof client.config.subscribeToWorkbookInteraction).toBe('function');
    expect(typeof client.config.triggerAction).toBe('function');
    expect(typeof client.config.registerEffect).toBe('function');
    expect(typeof client.config.configureEditorPanel).toBe('function');
    expect(typeof client.config.setLoadingState).toBe('function');
    expect(typeof client.config.getUrlParameter).toBe('function');
    expect(typeof client.config.setUrlParameter).toBe('function');
    expect(typeof client.config.subscribeToUrlParameter).toBe('function');
  });

  it('exposes the documented elements methods', () => {
    expect(typeof client.elements.getElementColumns).toBe('function');
    expect(typeof client.elements.subscribeToElementColumns).toBe('function');
    expect(typeof client.elements.subscribeToElementData).toBe('function');
    expect(typeof client.elements.fetchMoreElementData).toBe('function');
  });

  it('exposes the documented style methods', () => {
    expect(typeof client.style.subscribe).toBe('function');
    expect(typeof client.style.get).toBe('function');
  });
});
