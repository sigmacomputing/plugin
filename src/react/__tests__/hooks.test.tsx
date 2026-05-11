import { act, renderHook } from '@testing-library/react';
import * as React from 'react';

import { PluginInstance } from '../../types';
import { SigmaClientProvider } from '../Provider';
import {
  useActionEffect,
  useActionTrigger,
  useConfig,
  useEditorPanelConfig,
  useElementColumns,
  useElementData,
  useInteraction,
  useLoadingState,
  usePaginatedElementData,
  usePlugin,
  usePluginStyle,
  useUrlParameter,
  useVariable,
} from '../hooks';

type Subscriber<T> = (value: T) => void;

interface MockSubscription<T> {
  fn: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  emit: (value: T) => void;
}

function createSubscription<T>(): MockSubscription<T> {
  let callback: Subscriber<T> | null = null;
  const unsubscribe = vi.fn();
  const fn = vi.fn((...args: unknown[]) => {
    callback = args[args.length - 1] as Subscriber<T>;
    return unsubscribe;
  });
  return {
    fn,
    unsubscribe,
    emit: (value: T) => callback?.(value),
  };
}

function createMockClient() {
  const subs = {
    elementColumns: createSubscription<unknown>(),
    elementData: createSubscription<unknown>(),
    variable: createSubscription<unknown>(),
    urlParameter: createSubscription<unknown>(),
    interaction: createSubscription<unknown>(),
    config: createSubscription<unknown>(),
    style: createSubscription<unknown>(),
  };

  const styleResolvers: Array<(value: unknown) => void> = [];
  const stylePromises: Array<Promise<unknown>> = [];

  const client = {
    sigmaEnv: 'author' as const,
    config: {
      get: vi.fn(() => ({})),
      getKey: vi.fn(),
      set: vi.fn(),
      setKey: vi.fn(),
      subscribe: subs.config.fn,
      configureEditorPanel: vi.fn(),
      setLoadingState: vi.fn(),
      getVariable: vi.fn(),
      setVariable: vi.fn(),
      subscribeToWorkbookVariable: subs.variable.fn,
      getUrlParameter: vi.fn(),
      setUrlParameter: vi.fn(),
      subscribeToUrlParameter: subs.urlParameter.fn,
      getInteraction: vi.fn(),
      setInteraction: vi.fn(),
      subscribeToWorkbookInteraction: subs.interaction.fn,
      triggerAction: vi.fn(),
      registerEffect: vi.fn((_id: string, _effect: () => void) => vi.fn()),
    },
    elements: {
      getElementColumns: vi.fn(),
      subscribeToElementColumns: subs.elementColumns.fn,
      subscribeToElementData: subs.elementData.fn,
      fetchMoreElementData: vi.fn(),
    },
    style: {
      subscribe: subs.style.fn,
      get: vi.fn(() => {
        const promises = new Promise<unknown>(resolve => {
          styleResolvers.push(resolve);
        });
        stylePromises.push(promises);
        return promises;
      }),
    },
    destroy: vi.fn(),
  } as unknown as PluginInstance;

  return {
    client,
    subs,
    resolveStyleGet: (value: unknown) => {
      const resolver = styleResolvers.shift();
      resolver?.(value);
      return stylePromises.shift();
    },
  };
}

function withProvider(client: PluginInstance) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SigmaClientProvider client={client}>{children}</SigmaClientProvider>
    );
  };
}

describe('react/hooks', () => {
  describe('usePlugin', () => {
    it('returns the client from context', () => {
      const { client } = createMockClient();
      const { result } = renderHook(() => usePlugin(), {
        wrapper: withProvider(client),
      });
      expect(result.current).toBe(client);
    });
  });

  describe('useEditorPanelConfig', () => {
    it('calls configureEditorPanel on mount with provided options', () => {
      const { client } = createMockClient();
      const options = [{ type: 'group', name: 'g' } as any];
      renderHook(() => useEditorPanelConfig(options), {
        wrapper: withProvider(client),
      });
      expect(client.config.configureEditorPanel).toHaveBeenCalledWith(options);
    });

    it('does not re-call when options are deeply equal across renders', () => {
      const { client } = createMockClient();
      const { rerender } = renderHook(
        ({ opts }: { opts: any[] }) => useEditorPanelConfig(opts),
        {
          wrapper: withProvider(client),
          initialProps: { opts: [{ type: 'group', name: 'g' }] as any[] },
        },
      );
      expect(client.config.configureEditorPanel).toHaveBeenCalledTimes(1);
      rerender({ opts: [{ type: 'group', name: 'g' }] });
      expect(client.config.configureEditorPanel).toHaveBeenCalledTimes(1);
    });

    it('re-calls when options change', () => {
      const { client } = createMockClient();
      const { rerender } = renderHook(
        ({ opts }: { opts: any[] }) => useEditorPanelConfig(opts),
        {
          wrapper: withProvider(client),
          initialProps: { opts: [{ type: 'group', name: 'a' }] as any[] },
        },
      );
      rerender({ opts: [{ type: 'group', name: 'b' }] });
      expect(client.config.configureEditorPanel).toHaveBeenCalledTimes(2);
      expect(client.config.configureEditorPanel).toHaveBeenLastCalledWith([
        { type: 'group', name: 'b' },
      ]);
    });

    it('skips when nextOptions is null', () => {
      const { client } = createMockClient();
      renderHook(() => useEditorPanelConfig(null as any), {
        wrapper: withProvider(client),
      });
      expect(client.config.configureEditorPanel).not.toHaveBeenCalled();
    });
  });

  describe('useLoadingState', () => {
    it('sets the initial loading state and returns it', () => {
      const { client } = createMockClient();
      const { result } = renderHook(() => useLoadingState(true), {
        wrapper: withProvider(client),
      });
      expect(client.config.setLoadingState).toHaveBeenCalledWith(true);
      expect(result.current[0]).toBe(true);
    });

    it('setter updates state and calls setLoadingState when value changes', () => {
      const { client } = createMockClient();
      const { result } = renderHook(() => useLoadingState(true), {
        wrapper: withProvider(client),
      });
      (client.config.setLoadingState as any).mockClear();

      act(() => {
        result.current[1](false);
      });

      expect(result.current[0]).toBe(false);
      expect(client.config.setLoadingState).toHaveBeenCalledWith(false);
    });

    it('setter is a no-op when nextState equals current state', () => {
      const { client } = createMockClient();
      const { result } = renderHook(() => useLoadingState(true), {
        wrapper: withProvider(client),
      });
      (client.config.setLoadingState as any).mockClear();

      act(() => {
        result.current[1](true);
      });

      expect(client.config.setLoadingState).not.toHaveBeenCalled();
    });
  });

  describe('useElementColumns', () => {
    it('subscribes and returns the latest columns', () => {
      const { client, subs } = createMockClient();
      const { result } = renderHook(() => useElementColumns('el1'), {
        wrapper: withProvider(client),
      });
      expect(client.elements.subscribeToElementColumns).toHaveBeenCalledWith(
        'el1',
        expect.any(Function),
      );
      expect(result.current).toEqual({});

      const cols = { c1: { id: 'c1', name: 'C', columnType: 'text' } };
      act(() => subs.elementColumns.emit(cols));
      expect(result.current).toEqual(cols);
    });

    it('does not subscribe when configId is falsy', () => {
      const { client } = createMockClient();
      renderHook(() => useElementColumns(''), {
        wrapper: withProvider(client),
      });
      expect(client.elements.subscribeToElementColumns).not.toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const { client, subs } = createMockClient();
      const { unmount } = renderHook(() => useElementColumns('el1'), {
        wrapper: withProvider(client),
      });
      unmount();
      expect(subs.elementColumns.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('useElementData', () => {
    it('subscribes and returns the latest data', () => {
      const { client, subs } = createMockClient();
      const { result } = renderHook(() => useElementData('el1'), {
        wrapper: withProvider(client),
      });
      expect(client.elements.subscribeToElementData).toHaveBeenCalledWith(
        'el1',
        expect.any(Function),
      );

      const data = { c1: [1, 2, 3] };
      act(() => subs.elementData.emit(data));
      expect(result.current).toEqual(data);
    });

    it('does not subscribe when configId is falsy', () => {
      const { client } = createMockClient();
      renderHook(() => useElementData(undefined as any), {
        wrapper: withProvider(client),
      });
      expect(client.elements.subscribeToElementData).not.toHaveBeenCalled();
    });
  });

  describe('usePaginatedElementData', () => {
    it('subscribes to data and returns it with a loadMore callback', () => {
      const { client, subs } = createMockClient();
      const { result } = renderHook(() => usePaginatedElementData('el1'), {
        wrapper: withProvider(client),
      });
      const data = { c1: [1, 2] };
      act(() => subs.elementData.emit(data));
      expect(result.current[0]).toEqual(data);

      act(() => result.current[1]());
      expect(client.elements.fetchMoreElementData).toHaveBeenCalledWith('el1');
    });

    it('loadMore is a no-op when configId is falsy', () => {
      const { client } = createMockClient();
      const { result } = renderHook(() => usePaginatedElementData(''), {
        wrapper: withProvider(client),
      });
      act(() => result.current[1]());
      expect(client.elements.fetchMoreElementData).not.toHaveBeenCalled();
    });
  });

  describe('useConfig', () => {
    it('returns the full config when no key is provided', () => {
      const { client, subs } = createMockClient();
      (client.config.get as any).mockReturnValue({ a: 1 });
      const { result } = renderHook(() => useConfig(), {
        wrapper: withProvider(client),
      });
      expect(result.current).toEqual({ a: 1 });

      act(() => subs.config.emit({ a: 2 }));
      expect(result.current).toEqual({ a: 2 });
    });

    it('returns the keyed value when a key is provided', () => {
      const { client, subs } = createMockClient();
      (client.config.getKey as any).mockImplementation(
        (key: string) => (({ foo: 'bar' }) as any)[key],
      );
      const { result } = renderHook(() => useConfig('foo'), {
        wrapper: withProvider(client),
      });
      expect(client.config.getKey).toHaveBeenCalledWith('foo');
      expect(result.current).toBe('bar');

      act(() => subs.config.emit({ foo: 'baz' }));
      expect(result.current).toBe('baz');
    });
  });

  describe('useVariable', () => {
    it('returns the initial variable from getVariable', () => {
      const { client } = createMockClient();
      const variable = {
        name: 'v1',
        defaultValue: { type: 'text', value: 'hi' },
      };
      (client.config.getVariable as any).mockReturnValue(variable);
      const { result } = renderHook(() => useVariable('v1'), {
        wrapper: withProvider(client),
      });
      expect(client.config.getVariable).toHaveBeenCalledWith('v1');
      expect(result.current[0]).toEqual(variable);
    });

    it('updates when the subscription emits', () => {
      const { client, subs } = createMockClient();
      const { result } = renderHook(() => useVariable('v1'), {
        wrapper: withProvider(client),
      });
      const next = { name: 'v1', defaultValue: { type: 'text', value: 'b' } };
      act(() => subs.variable.emit(next));
      expect(result.current[0]).toEqual(next);
    });

    it('setter calls setVariable with id and values', () => {
      const { client } = createMockClient();
      const { result } = renderHook(() => useVariable('v1'), {
        wrapper: withProvider(client),
      });
      act(() => {
        result.current[1]('a', 'b');
      });
      expect(client.config.setVariable).toHaveBeenCalledWith('v1', 'a', 'b');
    });
  });

  describe('useUrlParameter', () => {
    it('returns the initial url parameter from getUrlParameter', () => {
      const { client } = createMockClient();
      (client.config.getUrlParameter as any).mockReturnValue({ value: 'x' });
      const { result } = renderHook(() => useUrlParameter('u1'), {
        wrapper: withProvider(client),
      });
      expect(client.config.getUrlParameter).toHaveBeenCalledWith('u1');
      expect(result.current[0]).toEqual({ value: 'x' });
    });

    it('updates when the subscription emits', () => {
      const { client, subs } = createMockClient();
      const { result } = renderHook(() => useUrlParameter('u1'), {
        wrapper: withProvider(client),
      });
      act(() => subs.urlParameter.emit({ value: 'y' }));
      expect(result.current[0]).toEqual({ value: 'y' });
    });

    it('setter calls setUrlParameter', () => {
      const { client } = createMockClient();
      const { result } = renderHook(() => useUrlParameter('u1'), {
        wrapper: withProvider(client),
      });
      act(() => result.current[1]('newVal'));
      expect(client.config.setUrlParameter).toHaveBeenCalledWith(
        'u1',
        'newVal',
      );
    });
  });

  describe('useInteraction', () => {
    it('updates state from the subscription', () => {
      const { client, subs } = createMockClient();
      const { result } = renderHook(() => useInteraction('i1', 'el1'), {
        wrapper: withProvider(client),
      });
      expect(client.config.subscribeToWorkbookInteraction).toHaveBeenCalledWith(
        'i1',
        expect.any(Function),
      );

      const selection = [{ col: { type: 'text', val: 1 } }];
      act(() => subs.interaction.emit(selection));
      expect(result.current[0]).toEqual(selection);
    });

    it('setter calls setInteraction with id, elementId, and value', () => {
      const { client } = createMockClient();
      const { result } = renderHook(() => useInteraction('i1', 'el1'), {
        wrapper: withProvider(client),
      });
      const selection = [{ col: { type: 'text' } }];
      act(() => {
        (result.current[1] as (value: typeof selection) => void)(selection);
      });
      expect(client.config.setInteraction).toHaveBeenCalledWith(
        'i1',
        'el1',
        selection,
      );
    });
  });

  describe('useActionTrigger', () => {
    it('returns a callback that triggers the action', () => {
      const { client } = createMockClient();
      const { result } = renderHook(() => useActionTrigger('a1'), {
        wrapper: withProvider(client),
      });
      act(() => result.current());
      expect(client.config.triggerAction).toHaveBeenCalledWith('a1');
    });
  });

  describe('useActionEffect', () => {
    it('registers an effect for the given configId', () => {
      const { client } = createMockClient();
      const effect = vi.fn();
      renderHook(() => useActionEffect('e1', effect), {
        wrapper: withProvider(client),
      });
      expect(client.config.registerEffect).toHaveBeenCalledWith(
        'e1',
        expect.any(Function),
      );
    });

    it('re-registers with the latest effect when effect changes', () => {
      const { client } = createMockClient();
      const first = vi.fn();
      const second = vi.fn();
      const { rerender } = renderHook(
        ({ fx }: { fx: () => void }) => useActionEffect('e1', fx),
        {
          wrapper: withProvider(client),
          initialProps: { fx: first },
        },
      );
      expect(client.config.registerEffect).toHaveBeenCalledTimes(1);

      rerender({ fx: second });
      expect(client.config.registerEffect).toHaveBeenCalledTimes(2);

      const calls = (client.config.registerEffect as any).mock.calls;
      const lastRegistered = calls[calls.length - 1][1] as () => void;
      lastRegistered();
      expect(second).toHaveBeenCalled();
      expect(first).not.toHaveBeenCalled();
    });

    it('unregisters the effect on unmount', () => {
      const { client } = createMockClient();
      const unregister = vi.fn();
      (client.config.registerEffect as any).mockReturnValue(unregister);
      const { unmount } = renderHook(() => useActionEffect('e1', vi.fn()), {
        wrapper: withProvider(client),
      });
      unmount();
      expect(unregister).toHaveBeenCalled();
    });
  });

  describe('usePluginStyle', () => {
    it('returns undefined initially and updates from style.get()', async () => {
      const { client, resolveStyleGet } = createMockClient();
      const { result } = renderHook(() => usePluginStyle(), {
        wrapper: withProvider(client),
      });
      expect(result.current).toBeUndefined();
      expect(client.style.get).toHaveBeenCalled();

      await act(async () => {
        await resolveStyleGet({ backgroundColor: '#FFFFFF' });
      });
      expect(result.current).toEqual({ backgroundColor: '#FFFFFF' });
    });

    it('updates when style.subscribe emits', () => {
      const { client, subs } = createMockClient();
      const { result } = renderHook(() => usePluginStyle(), {
        wrapper: withProvider(client),
      });
      act(() => subs.style.emit({ backgroundColor: '#000000' }));
      expect(result.current).toEqual({ backgroundColor: '#000000' });
    });
  });
});
