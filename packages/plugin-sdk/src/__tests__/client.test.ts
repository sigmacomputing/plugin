import { client } from '../client';

describe('client', () => {
  it('exports a singleton plugin instance', () => {
    expect(client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.elements).toBeDefined();
    expect(client.style).toBeDefined();
    expect(typeof client.destroy).toBe('function');
  });
});
