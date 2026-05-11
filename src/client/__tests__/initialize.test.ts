import type { MockInstance } from 'vitest';

import { PluginInstance } from '../../types';
import { initialize } from '../initialize';

interface PluginMessage {
  type: string;
  args?: unknown[];
  elementId?: string;
}

type PostMessageFn = (message: PluginMessage, targetOrigin: string) => void;

// `window.postMessage` has multiple overloads in lib.dom, which makes the
// inferred `MockInstance` lose its `calls` arg types. We narrow to the exact
// shape `initialize.ts` always passes (`{ type, args, elementId }`, targetOrigin)
// so `spy.mock.calls` is properly typed at use sites.
type PostMessageSpy = MockInstance<PostMessageFn>;

function sendWindowMessage(data: {
  type: string;
  result?: unknown;
  error?: unknown;
}) {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

function postMessages(spy: PostMessageSpy) {
  return spy.mock.calls.map(call => ({ data: call[0], origin: call[1] }));
}

function findPostMessage(spy: PostMessageSpy, type: string) {
  return postMessages(spy).find(message => message.data.type === type);
}

// Initializes a client while capturing the source's `message` listener so
// tests can invoke it directly. Direct invocation lets thrown errors propagate
// synchronously to `expect().toThrow` instead of bubbling out as uncaught
// errors (which Vite + Vitest each log to the console).
function initializeAndCaptureMessageListener<T>() {
  let messageListener: ((event: unknown) => void) | undefined;
  const original = window.addEventListener.bind(window);
  const spy = vi.spyOn(window, 'addEventListener').mockImplementation(((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => {
    if (type === 'message') {
      messageListener = listener as (event: unknown) => void;
    }
    return original(type, listener, options);
  }) as typeof window.addEventListener);
  const client = initialize<T>();
  spy.mockRestore();
  if (!messageListener) {
    throw new Error('Failed to capture message listener');
  }
  return { client, messageListener };
}

describe('initialize', () => {
  let postMessageSpy: PostMessageSpy;
  let originalUrl: string;

  beforeEach(() => {
    originalUrl = window.location.href;
    postMessageSpy = vi
      .spyOn(window.parent, 'postMessage')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    postMessageSpy.mockRestore();
    window.history.replaceState({}, '', originalUrl);
  });

  describe('lifecycle', () => {
    it('returns a client with the expected shape', () => {
      const client = initialize();
      expect(client.config).toBeDefined();
      expect(client.elements).toBeDefined();
      expect(client.style).toBeDefined();
      expect(typeof client.destroy).toBe('function');
      client.destroy();
    });

    it('attaches a message listener and removes it on destroy', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const client = initialize();
      const messageAdd = addSpy.mock.calls.find(call => call[0] === 'message');
      expect(messageAdd).toBeDefined();

      client.destroy();
      const messageRemove = removeSpy.mock.calls.find(
        call => call[0] === 'message',
      );
      expect(messageRemove).toBeDefined();
      // The same listener reference is used for add and remove
      expect(messageRemove?.[1]).toBe(messageAdd?.[1]);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('sends an initial wb:plugin:init message including the SDK version', () => {
      const client = initialize();
      const init = findPostMessage(postMessageSpy, 'wb:plugin:init');
      expect(init).toBeDefined();
      expect(Array.isArray(init?.data.args)).toBe(true);
      expect(typeof init?.data.args?.[0]).toBe('string');
      client.destroy();
    });

    it('sends a focus event on window click', () => {
      const client = initialize();
      postMessageSpy.mockClear();
      window.dispatchEvent(new MouseEvent('click'));
      const focus = findPostMessage(postMessageSpy, 'wb:plugin:focus');
      expect(focus).toBeDefined();
      client.destroy();
    });
  });

  describe('URL param parsing', () => {
    it('parses JSON-encoded URL params into the plugin config', () => {
      window.history.replaceState({}, '', '/?id=%22abc%22');
      const client = initialize();
      const init = findPostMessage(postMessageSpy, 'wb:plugin:init');
      expect(init?.data.elementId).toBe('abc');
      client.destroy();
    });

    it('uses wbOrigin from URL params for postMessage', () => {
      const origin = 'https://sigma.example';
      window.history.replaceState(
        {},
        '',
        '/?wbOrigin=' + encodeURIComponent(JSON.stringify(origin)),
      );
      const client = initialize();
      const init = findPostMessage(postMessageSpy, 'wb:plugin:init');
      expect(init?.origin).toBe(origin);
      client.destroy();
    });

    it('falls back to "*" when wbOrigin is not provided', () => {
      window.history.replaceState({}, '', '/');
      const client = initialize();
      const init = findPostMessage(postMessageSpy, 'wb:plugin:init');
      expect(init?.origin).toBe('*');
      client.destroy();
    });

    it('logs an error for malformed JSON params', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      window.history.replaceState({}, '', '/?bad=notJson');
      const client = initialize();
      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy.mock.calls[0][0]).toContain(
        'Failed to parse URL param bad',
      );
      errorSpy.mockRestore();
      client.destroy();
    });

    it('silently ignores invalid iframeId and sessionId in the vitest browser', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      window.history.replaceState(
        {},
        '',
        '/?iframeId=notJson&sessionId=alsoNotJson',
      );
      const client = initialize();
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
      client.destroy();
    });
  });

  describe('init response', () => {
    it('updates pluginConfig and emits config when init resolves', async () => {
      const client = initialize();
      const configListener = vi.fn();
      client.config.subscribe(configListener);

      sendWindowMessage({
        type: 'wb:plugin:init',
        result: { sigmaEnv: 'author', config: { foo: 'bar' } },
        error: null,
      });
      await Promise.resolve();

      expect(client.sigmaEnv).toBe('author');
      expect(client.config.get()).toEqual({ foo: 'bar' });
      expect(configListener).toHaveBeenCalledWith({ foo: 'bar' });
      client.destroy();
    });

    it('exposes isScreenshot from the init response', async () => {
      const client = initialize();
      sendWindowMessage({
        type: 'wb:plugin:init',
        result: { screenshot: true },
        error: null,
      });
      await Promise.resolve();
      expect(
        (client as unknown as { isScreenshot: boolean }).isScreenshot,
      ).toBe(true);
      client.destroy();
    });
  });

  describe('config API', () => {
    let client: PluginInstance;

    beforeEach(async () => {
      client = initialize();
      sendWindowMessage({
        type: 'wb:plugin:init',
        result: { config: { initial: 'x' } },
        error: null,
      });
      await Promise.resolve();
      postMessageSpy.mockClear();
    });

    afterEach(() => {
      client.destroy();
    });

    it('get returns the current config', () => {
      expect(client.config.get()).toEqual({ initial: 'x' });
    });

    it('getKey returns a value from the config', () => {
      expect(
        (
          client.config as unknown as { getKey: (key: string) => unknown }
        ).getKey('initial'),
      ).toBe('x');
    });

    it('set posts wb:plugin:config:update with the partial config', () => {
      client.config.set({ a: 1 } as Record<string, unknown>);
      const msg = findPostMessage(postMessageSpy, 'wb:plugin:config:update');
      expect(msg?.data.args).toEqual([{ a: 1 }]);
    });

    it('setKey posts wb:plugin:config:update with a single key/value', () => {
      (
        client.config as unknown as {
          setKey: (key: string, value: unknown) => void;
        }
      ).setKey('newKey', 'newVal');
      const msg = findPostMessage(postMessageSpy, 'wb:plugin:config:update');
      expect(msg?.data.args).toEqual([{ newKey: 'newVal' }]);
    });

    it('subscribe receives updates from wb:plugin:config:update messages', () => {
      const listener = vi.fn();
      client.config.subscribe(listener);
      sendWindowMessage({
        type: 'wb:plugin:config:update',
        result: { config: { b: 2 } },
        error: null,
      });
      expect(listener).toHaveBeenCalledWith({ b: 2 });
    });

    it('subscribe falls back to an empty object when config is missing', () => {
      const listener = vi.fn();
      client.config.subscribe(listener);
      sendWindowMessage({
        type: 'wb:plugin:config:update',
        result: { config: null },
        error: null,
      });
      expect(listener).toHaveBeenCalledWith({});
    });

    it('subscribe returns a working unsubscriber', () => {
      const listener = vi.fn();
      const unsub = client.config.subscribe(listener);
      unsub();
      sendWindowMessage({
        type: 'wb:plugin:config:update',
        result: { config: { c: 3 } },
        error: null,
      });
      expect(listener).not.toHaveBeenCalled();
    });

    it('getVariable returns the subscribed variable for the given id', () => {
      sendWindowMessage({
        type: 'wb:plugin:variable:update',
        result: {
          v1: { name: 'v1', defaultValue: { type: 'text', value: 'hi' } },
        },
        error: null,
      });
      expect(client.config.getVariable('v1')).toEqual({
        name: 'v1',
        defaultValue: { type: 'text', value: 'hi' },
      });
    });

    it('setVariable posts wb:plugin:variable:set with id and values', () => {
      client.config.setVariable('v1', 'a', 'b');
      const msg = findPostMessage(postMessageSpy, 'wb:plugin:variable:set');
      expect(msg?.data.args).toEqual(['v1', 'a', 'b']);
    });

    it('subscribeToWorkbookVariable invokes the callback on updates', () => {
      const callback = vi.fn();
      client.config.subscribeToWorkbookVariable('v1', callback);
      sendWindowMessage({
        type: 'wb:plugin:variable:update',
        result: { v1: { name: 'v1', defaultValue: { type: 't', value: 1 } } },
        error: null,
      });
      expect(callback).toHaveBeenCalledWith({
        name: 'v1',
        defaultValue: { type: 't', value: 1 },
      });
    });

    it('subscribeToWorkbookVariable returns a working unsubscriber', () => {
      const callback = vi.fn();
      const unsub = client.config.subscribeToWorkbookVariable('v1', callback);
      unsub();
      sendWindowMessage({
        type: 'wb:plugin:variable:update',
        result: { v1: { name: 'v1', defaultValue: { type: 't', value: 2 } } },
        error: null,
      });
      expect(callback).not.toHaveBeenCalled();
    });

    it('getInteraction returns the subscribed interaction selection', () => {
      sendWindowMessage({
        type: 'wb:plugin:selection:update',
        result: { i1: [{ col: { type: 't', val: 1 } }] },
        error: null,
      });
      expect(client.config.getInteraction('i1')).toEqual([
        { col: { type: 't', val: 1 } },
      ]);
    });

    it('setInteraction posts wb:plugin:selection:set with id, element, and selection', () => {
      client.config.setInteraction('cfg', 'el', [{ col: { type: 't' } }]);
      const msg = findPostMessage(postMessageSpy, 'wb:plugin:selection:set');
      expect(msg?.data.args).toEqual(['cfg', 'el', [{ col: { type: 't' } }]]);
    });

    it('subscribeToWorkbookInteraction invokes the callback on updates', () => {
      const callback = vi.fn();
      client.config.subscribeToWorkbookInteraction('i1', callback);
      sendWindowMessage({
        type: 'wb:plugin:selection:update',
        result: { i1: [{ a: { type: 't' } }] },
        error: null,
      });
      expect(callback).toHaveBeenCalledWith([{ a: { type: 't' } }]);
    });

    it('subscribeToWorkbookInteraction returns a working unsubscriber', () => {
      const callback = vi.fn();
      const unsub = client.config.subscribeToWorkbookInteraction(
        'i1',
        callback,
      );
      unsub();
      sendWindowMessage({
        type: 'wb:plugin:selection:update',
        result: { i1: [{ a: { type: 't' } }] },
        error: null,
      });
      expect(callback).not.toHaveBeenCalled();
    });

    it('triggerAction posts wb:plugin:action-trigger:invoke', () => {
      client.config.triggerAction('cfg');
      const msg = findPostMessage(
        postMessageSpy,
        'wb:plugin:action-trigger:invoke',
      );
      expect(msg?.data.args).toEqual(['cfg']);
    });

    it('registerEffect stores an effect that is called on invoke', () => {
      const fn = vi.fn();
      client.config.registerEffect('e1', fn);
      sendWindowMessage({
        type: 'wb:plugin:action-effect:invoke',
        result: 'e1',
        error: null,
      });
      expect(fn).toHaveBeenCalled();
    });

    it('registerEffect returns an unregister function that detaches the effect', () => {
      // Use a fresh client whose message listener we can call directly: the
      // throw needs to propagate synchronously into `expect().toThrow` rather
      // than escape as an uncaught error via `window.dispatchEvent`.
      client.destroy();
      const captured = initializeAndCaptureMessageListener();
      client = captured.client;
      const fn = vi.fn();
      const unreg = client.config.registerEffect('e1', fn);
      unreg();
      expect(() => {
        captured.messageListener({
          data: {
            type: 'wb:plugin:action-effect:invoke',
            result: 'e1',
            error: null,
          },
        });
      }).toThrow(/Unknown action effect with name: e1/);
      expect(fn).not.toHaveBeenCalled();
    });

    it('throws when an unknown action effect is invoked', () => {
      client.destroy();
      const captured = initializeAndCaptureMessageListener();
      client = captured.client;
      expect(() => {
        captured.messageListener({
          data: {
            type: 'wb:plugin:action-effect:invoke',
            result: 'unknown',
            error: null,
          },
        });
      }).toThrow(/Unknown action effect with name: unknown/);
    });

    it('configureEditorPanel posts wb:plugin:config:inspector with options', () => {
      const options = [{ type: 'group', name: 'g' } as const];
      client.config.configureEditorPanel(options as any);
      const msg = findPostMessage(postMessageSpy, 'wb:plugin:config:inspector');
      expect(msg?.data.args).toEqual([options]);
    });

    it('setLoadingState posts wb:plugin:config:loading-state', () => {
      client.config.setLoadingState(true);
      const msg = findPostMessage(
        postMessageSpy,
        'wb:plugin:config:loading-state',
      );
      expect(msg?.data.args).toEqual([true]);
    });

    it('getUrlParameter returns the subscribed url parameter', () => {
      sendWindowMessage({
        type: 'wb:plugin:url-parameter:update',
        result: { u1: { value: 'val' } },
        error: null,
      });
      expect(client.config.getUrlParameter('u1')).toEqual({ value: 'val' });
    });

    it('setUrlParameter posts wb:plugin:url-parameter:set', () => {
      client.config.setUrlParameter('u1', 'newVal');
      const msg = findPostMessage(
        postMessageSpy,
        'wb:plugin:url-parameter:set',
      );
      expect(msg?.data.args).toEqual(['u1', 'newVal']);
    });

    it('subscribeToUrlParameter invokes the callback with the initial value', () => {
      const callback = vi.fn();
      client.config.subscribeToUrlParameter('u1', callback);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(undefined);
    });

    it('subscribeToUrlParameter invokes the callback on updates', () => {
      const callback = vi.fn();
      client.config.subscribeToUrlParameter('u1', callback);
      callback.mockClear();
      sendWindowMessage({
        type: 'wb:plugin:url-parameter:update',
        result: { u1: { value: 'V' } },
        error: null,
      });
      expect(callback).toHaveBeenCalledWith({ value: 'V' });
    });

    it('subscribeToUrlParameter returns a working unsubscriber', () => {
      const callback = vi.fn();
      const unsub = client.config.subscribeToUrlParameter('u1', callback);
      unsub();
      callback.mockClear();
      sendWindowMessage({
        type: 'wb:plugin:url-parameter:update',
        result: { u1: { value: 'X' } },
        error: null,
      });
      expect(callback).not.toHaveBeenCalled();
    });

    it('warns through validateConfigId when configId is undefined', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      client.config.getVariable(undefined as unknown as string);
      expect(warnSpy).toHaveBeenCalledWith(
        'Invalid config variable: undefined',
      );
      warnSpy.mockRestore();
    });
  });

  describe('elements API', () => {
    let client: PluginInstance;

    beforeEach(async () => {
      client = initialize();
      sendWindowMessage({ type: 'wb:plugin:init', result: {}, error: null });
      await Promise.resolve();
      postMessageSpy.mockClear();
    });

    afterEach(() => {
      client.destroy();
    });

    it('getElementColumns posts wb:plugin:element:columns:get and returns a Promise', () => {
      const promise = client.elements.getElementColumns('el1');
      expect(promise).toBeInstanceOf(Promise);
      const msg = findPostMessage(
        postMessageSpy,
        'wb:plugin:element:columns:get',
      );
      expect(msg?.data.args).toEqual(['el1']);
    });

    it('getElementColumns resolves with the response data', async () => {
      const columns = { c1: { id: 'c1', name: 'C', columnType: 'text' } };
      const promise = client.elements.getElementColumns('el1');
      sendWindowMessage({
        type: 'wb:plugin:element:columns:get',
        result: columns,
        error: null,
      });
      await expect(promise).resolves.toEqual(columns);
    });

    it('getElementColumns rejects when the response carries an error', async () => {
      const promise = client.elements.getElementColumns('el1');
      sendWindowMessage({
        type: 'wb:plugin:element:columns:get',
        result: null,
        error: 'boom',
      });
      await expect(promise).rejects.toBe('boom');
    });

    it('subscribeToElementColumns subscribes, dispatches data, and unsubscribes', () => {
      const callback = vi.fn();
      const unsub = client.elements.subscribeToElementColumns('el1', callback);

      const sub = findPostMessage(
        postMessageSpy,
        'wb:plugin:element:subscribe:columns',
      );
      expect(sub?.data.args).toEqual(['el1']);

      const columns = { c1: { id: 'c1', name: 'X', columnType: 'number' } };
      sendWindowMessage({
        type: 'wb:plugin:element:el1:columns',
        result: columns,
        error: null,
      });
      expect(callback).toHaveBeenCalledWith(columns, null);

      postMessageSpy.mockClear();
      callback.mockClear();
      unsub();
      const unsubMsg = findPostMessage(
        postMessageSpy,
        'wb:plugin:element:unsubscribe:columns',
      );
      expect(unsubMsg?.data.args).toEqual(['el1']);

      sendWindowMessage({
        type: 'wb:plugin:element:el1:columns',
        result: columns,
        error: null,
      });
      expect(callback).not.toHaveBeenCalled();
    });

    it('subscribeToElementData subscribes, dispatches data, and unsubscribes', () => {
      const callback = vi.fn();
      const unsub = client.elements.subscribeToElementData('el1', callback);

      const sub = findPostMessage(
        postMessageSpy,
        'wb:plugin:element:subscribe:data',
      );
      expect(sub?.data.args).toEqual(['el1']);

      const data = { c1: [1, 2, 3] };
      sendWindowMessage({
        type: 'wb:plugin:element:el1:data',
        result: data,
        error: null,
      });
      expect(callback).toHaveBeenCalledWith(data, null);

      postMessageSpy.mockClear();
      callback.mockClear();
      unsub();
      const unsubMsg = findPostMessage(
        postMessageSpy,
        'wb:plugin:element:unsubscribe:data',
      );
      expect(unsubMsg?.data.args).toEqual(['el1']);

      sendWindowMessage({
        type: 'wb:plugin:element:el1:data',
        result: data,
        error: null,
      });
      expect(callback).not.toHaveBeenCalled();
    });

    it('fetchMoreElementData posts wb:plugin:element:fetch-more', () => {
      client.elements.fetchMoreElementData('el1');
      const msg = findPostMessage(
        postMessageSpy,
        'wb:plugin:element:fetch-more',
      );
      expect(msg?.data.args).toEqual(['el1']);
    });

    it('warns through validateConfigId for an undefined element id', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      client.elements.fetchMoreElementData(undefined as unknown as string);
      expect(warnSpy).toHaveBeenCalledWith('Invalid config element: undefined');
      warnSpy.mockRestore();
    });
  });

  describe('style API', () => {
    let client: PluginInstance;

    beforeEach(async () => {
      client = initialize();
      sendWindowMessage({ type: 'wb:plugin:init', result: {}, error: null });
      await Promise.resolve();
      postMessageSpy.mockClear();
    });

    afterEach(() => {
      client.destroy();
    });

    it('subscribe receives style updates', () => {
      const callback = vi.fn();
      client.style.subscribe(callback);
      sendWindowMessage({
        type: 'wb:plugin:style:update',
        result: { backgroundColor: '#FFFFFF' },
        error: null,
      });
      expect(callback).toHaveBeenCalledWith(
        { backgroundColor: '#FFFFFF' },
        null,
      );
    });

    it('subscribe returns a working unsubscriber', () => {
      const callback = vi.fn();
      const unsub = client.style.subscribe(callback);
      unsub();
      sendWindowMessage({
        type: 'wb:plugin:style:update',
        result: { backgroundColor: '#000000' },
        error: null,
      });
      expect(callback).not.toHaveBeenCalled();
    });

    it('get sends wb:plugin:style:get and resolves with the style', async () => {
      const promise = client.style.get();
      const msg = findPostMessage(postMessageSpy, 'wb:plugin:style:get');
      expect(msg).toBeDefined();
      sendWindowMessage({
        type: 'wb:plugin:style:get',
        result: { backgroundColor: '#AABBCC' },
        error: null,
      });
      await expect(promise).resolves.toEqual({ backgroundColor: '#AABBCC' });
    });
  });

  describe('destroy', () => {
    it('clears listeners so further messages do not trigger callbacks', async () => {
      const client = initialize();
      sendWindowMessage({ type: 'wb:plugin:init', result: {}, error: null });
      await Promise.resolve();

      const callback = vi.fn();
      client.config.subscribe(callback);
      client.destroy();

      sendWindowMessage({
        type: 'wb:plugin:config:update',
        result: { config: { x: 1 } },
        error: null,
      });
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
