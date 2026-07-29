import { act, renderHook } from '@testing-library/react';
import * as React from 'react';

import { initialize } from '../../client/initialize';
import { PluginInstance } from '../../types';
import { SigmaClientProvider } from '../Provider';
import {
  useActionEffect,
  useActionTrigger,
  useConfig,
  useEditorPanelConfig,
  useElementColumns,
  useElementData,
  useIncrementalElementData,
  useInteraction,
  useLoadingState,
  usePaginatedElementData,
  usePlugin,
  usePluginStyle,
  useUrlParameter,
  useVariable,
} from '../hooks';

type Subscriber<T> = (value: T) => void;

interface SubscriptionStub<T> {
  unsubscribe: ReturnType<typeof vi.fn>;
  emit: (value: T) => void;
  spy: ReturnType<typeof vi.spyOn>;
}

// Replaces a subscribe-style method on the real client with a stub that
// captures the callback (so tests can synchronously emit values to the hook)
// and returns a vi.fn() unsubscriber that tests can assert against.
function stubSubscription<T>(
  target: object,
  method: string,
): SubscriptionStub<T> {
  let callback: Subscriber<T> | null = null;
  const unsubscribe = vi.fn();
  const spy = vi.spyOn(target as any, method as any).mockImplementation(((
    ...args: unknown[]
  ) => {
    callback = args[args.length - 1] as Subscriber<T>;
    return unsubscribe;
  }) as never);
  return {
    unsubscribe,
    emit: (value: T) => callback?.(value),
    spy,
  };
}

// Stubs client.style.get to return a promise the test controls — the real
// implementation would resolve only after a wb:plugin:style:get postMessage
// round-trip we don't simulate here.
function stubStyleGet(client: PluginInstance) {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>(r => {
    resolve = r;
  });
  const spy = vi.spyOn(client.style, 'get').mockReturnValue(promise as never);
  return { resolve, spy };
}

function withProvider(client: PluginInstance) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SigmaClientProvider client={client}>{children}</SigmaClientProvider>
    );
  };
}

describe('react/hooks', () => {
  let client: PluginInstance;

  beforeEach(() => {
    // Prevent the real client from posting messages to window.parent during
    // initialize() and from any spied-through method that calls execPromise.
    vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    client = initialize();
  });

  afterEach(() => {
    client.destroy();
    vi.restoreAllMocks();
  });

  describe('usePlugin', () => {
    it('returns the client from context', () => {
      const { result } = renderHook(() => usePlugin(), {
        wrapper: withProvider(client),
      });
      expect(result.current).toBe(client);
    });
  });

  describe('useEditorPanelConfig', () => {
    it('calls configureEditorPanel on mount with provided options', () => {
      const spy = vi.spyOn(client.config, 'configureEditorPanel');
      const options = [{ type: 'group', name: 'g' } as any];
      renderHook(() => useEditorPanelConfig(options), {
        wrapper: withProvider(client),
      });
      expect(spy).toHaveBeenCalledWith(options);
    });

    it('does not re-call when options are deeply equal across renders', () => {
      const spy = vi.spyOn(client.config, 'configureEditorPanel');
      const { rerender } = renderHook(
        ({ opts }: { opts: any[] }) => useEditorPanelConfig(opts),
        {
          wrapper: withProvider(client),
          initialProps: { opts: [{ type: 'group', name: 'g' }] as any[] },
        },
      );
      expect(spy).toHaveBeenCalledTimes(1);
      rerender({ opts: [{ type: 'group', name: 'g' }] });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('re-calls when options change', () => {
      const spy = vi.spyOn(client.config, 'configureEditorPanel');
      const { rerender } = renderHook(
        ({ opts }: { opts: any[] }) => useEditorPanelConfig(opts),
        {
          wrapper: withProvider(client),
          initialProps: { opts: [{ type: 'group', name: 'a' }] as any[] },
        },
      );
      rerender({ opts: [{ type: 'group', name: 'b' }] });
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenLastCalledWith([{ type: 'group', name: 'b' }]);
    });

    it('skips when nextOptions is null', () => {
      const spy = vi.spyOn(client.config, 'configureEditorPanel');
      renderHook(() => useEditorPanelConfig(null as any), {
        wrapper: withProvider(client),
      });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('useLoadingState', () => {
    it('sets the initial loading state and returns it', () => {
      const spy = vi.spyOn(client.config, 'setLoadingState');
      const { result } = renderHook(() => useLoadingState(true), {
        wrapper: withProvider(client),
      });
      expect(spy).toHaveBeenCalledWith(true);
      expect(result.current[0]).toBe(true);
    });

    it('setter updates state and calls setLoadingState when value changes', () => {
      const spy = vi.spyOn(client.config, 'setLoadingState');
      const { result } = renderHook(() => useLoadingState(true), {
        wrapper: withProvider(client),
      });
      spy.mockClear();

      act(() => {
        result.current[1](false);
      });

      expect(result.current[0]).toBe(false);
      expect(spy).toHaveBeenCalledWith(false);
    });

    it('setter is a no-op when nextState equals current state', () => {
      const spy = vi.spyOn(client.config, 'setLoadingState');
      const { result } = renderHook(() => useLoadingState(true), {
        wrapper: withProvider(client),
      });
      spy.mockClear();

      act(() => {
        result.current[1](true);
      });

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('useElementColumns', () => {
    it('subscribes and returns the latest columns', () => {
      const sub = stubSubscription<any>(
        client.elements,
        'subscribeToElementColumns',
      );
      const { result } = renderHook(() => useElementColumns('el1'), {
        wrapper: withProvider(client),
      });
      expect(sub.spy).toHaveBeenCalledWith('el1', expect.any(Function));
      expect(result.current).toEqual({});

      const cols = { c1: { id: 'c1', name: 'C', columnType: 'text' } };
      act(() => sub.emit(cols));
      expect(result.current).toEqual(cols);
    });

    it('does not subscribe when configId is falsy', () => {
      const spy = vi.spyOn(client.elements, 'subscribeToElementColumns');
      renderHook(() => useElementColumns(''), {
        wrapper: withProvider(client),
      });
      expect(spy).not.toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const sub = stubSubscription<any>(
        client.elements,
        'subscribeToElementColumns',
      );
      const { unmount } = renderHook(() => useElementColumns('el1'), {
        wrapper: withProvider(client),
      });
      unmount();
      expect(sub.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('useElementData', () => {
    it('subscribes and returns the latest data', () => {
      const sub = stubSubscription<any>(
        client.elements,
        'subscribeToElementData',
      );
      const { result } = renderHook(() => useElementData('el1'), {
        wrapper: withProvider(client),
      });
      expect(sub.spy).toHaveBeenCalledWith('el1', expect.any(Function));

      const data = { c1: [1, 2, 3] };
      act(() => sub.emit(data));
      expect(result.current).toEqual(data);
    });

    it('does not subscribe when configId is falsy', () => {
      const spy = vi.spyOn(client.elements, 'subscribeToElementData');
      renderHook(() => useElementData(undefined as any), {
        wrapper: withProvider(client),
      });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('usePaginatedElementData', () => {
    it('subscribes to data and returns it with a loadMore callback', () => {
      const sub = stubSubscription<any>(
        client.elements,
        'subscribeToElementData',
      );
      const fetchSpy = vi.spyOn(client.elements, 'fetchMoreElementData');
      const { result } = renderHook(() => usePaginatedElementData('el1'), {
        wrapper: withProvider(client),
      });
      const data = { c1: [1, 2] };
      act(() => sub.emit(data));
      expect(result.current[0]).toEqual(data);

      act(() => result.current[1]());
      expect(fetchSpy).toHaveBeenCalledWith('el1');
    });

    it('loadMore is a no-op when configId is falsy', () => {
      const fetchSpy = vi.spyOn(client.elements, 'fetchMoreElementData');
      const { result } = renderHook(() => usePaginatedElementData(''), {
        wrapper: withProvider(client),
      });
      act(() => result.current[1]());
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('useIncrementalElementData', () => {
    it('subscribes to incremental data and concatenates chunks by offset', () => {
      const sub = stubSubscription<any>(
        client.elements,
        'subscribeToIncrementalElementData',
      );
      const { result } = renderHook(() => useIncrementalElementData('el1'), {
        wrapper: withProvider(client),
      });
      expect(sub.spy).toHaveBeenCalledWith('el1', expect.any(Function));
      expect(result.current[0]).toEqual({});
      expect(result.current[2]).toEqual({ rowCount: 0, isComplete: false });

      act(() =>
        sub.emit({
          data: { c1: [1, 2], c2: ['a', 'b'] },
          offset: 0,
          isComplete: false,
          totalRows: 4,
        }),
      );
      act(() =>
        sub.emit({
          data: { c1: [3, 4], c2: ['c', 'd'] },
          offset: 2,
          isComplete: true,
        }),
      );

      expect(result.current[0]).toEqual({
        c1: [1, 2, 3, 4],
        c2: ['a', 'b', 'c', 'd'],
      });
      expect(result.current[2]).toEqual({
        rowCount: 4,
        isComplete: true,
        totalRows: 4,
      });
    });

    it('applies overlapping chunks idempotently by trusting the offset', () => {
      const sub = stubSubscription<any>(
        client.elements,
        'subscribeToIncrementalElementData',
      );
      const { result } = renderHook(() => useIncrementalElementData('el1'), {
        wrapper: withProvider(client),
      });

      act(() =>
        sub.emit({ data: { c1: [1, 2, 3] }, offset: 0, isComplete: false }),
      );
      const overlapping = {
        data: { c1: [3, 4] },
        offset: 2,
        isComplete: false,
      };
      act(() => sub.emit(overlapping));
      act(() => sub.emit(overlapping));

      expect(result.current[0]).toEqual({ c1: [1, 2, 3, 4] });
      expect(result.current[2].rowCount).toBe(4);
    });

    it('preserves accumulated data when a terminal chunk is empty or omits a column', () => {
      const sub = stubSubscription<any>(
        client.elements,
        'subscribeToIncrementalElementData',
      );
      const { result } = renderHook(() => useIncrementalElementData('el1'), {
        wrapper: withProvider(client),
      });

      act(() =>
        sub.emit({
          data: { c1: [1, 2], c2: ['a', 'b'] },
          offset: 0,
          isComplete: false,
        }),
      );
      // A chunk omitting c2 must not delete c2's accumulated rows.
      act(() =>
        sub.emit({ data: { c1: [3, 4] }, offset: 2, isComplete: false }),
      );
      // An empty terminal chunk only flips isComplete.
      act(() => sub.emit({ data: {}, offset: 4, isComplete: true }));

      expect(result.current[0]).toEqual({ c1: [1, 2, 3, 4], c2: ['a', 'b'] });
      expect(result.current[2]).toEqual({ rowCount: 4, isComplete: true });
    });

    it('replaces state wholesale and re-baselines totalRows on an offset-0 restart', () => {
      const sub = stubSubscription<any>(
        client.elements,
        'subscribeToIncrementalElementData',
      );
      const { result } = renderHook(() => useIncrementalElementData('el1'), {
        wrapper: withProvider(client),
      });

      act(() =>
        sub.emit({
          data: { c1: [1, 2, 3] },
          offset: 0,
          isComplete: true,
          totalRows: 3,
        }),
      );
      // Host refresh: new column set, no totalRows reported.
      act(() =>
        sub.emit({ data: { c9: ['x'] }, offset: 0, isComplete: false }),
      );

      expect(result.current[0]).toEqual({ c9: ['x'] });
      expect(result.current[2]).toEqual({ rowCount: 1, isComplete: false });
    });

    it('keeps rows at their absolute offsets for gaps and columns appearing mid-stream', () => {
      const sub = stubSubscription<any>(
        client.elements,
        'subscribeToIncrementalElementData',
      );
      const { result } = renderHook(() => useIncrementalElementData('el1'), {
        wrapper: withProvider(client),
      });

      act(() =>
        sub.emit({ data: { c1: [1, 2] }, offset: 0, isComplete: false }),
      );
      // c2 first appears at offset 2; its rows must not land at index 0.
      act(() =>
        sub.emit({
          data: { c1: [3, 4], c2: ['c', 'd'] },
          offset: 2,
          isComplete: false,
        }),
      );

      expect(result.current[0].c1).toEqual([1, 2, 3, 4]);
      expect(result.current[0].c2.length).toBe(4);
      expect(result.current[0].c2[2]).toBe('c');
      expect(result.current[0].c2[3]).toBe('d');
      expect(result.current[0].c2[0]).toBeUndefined();
    });

    it('tolerates column ids that collide with Object.prototype members', () => {
      const sub = stubSubscription<any>(
        client.elements,
        'subscribeToIncrementalElementData',
      );
      const { result } = renderHook(() => useIncrementalElementData('el1'), {
        wrapper: withProvider(client),
      });

      // JSON.parse creates '__proto__' as an own enumerable property, which
      // is exactly what a (hostile or buggy) wire payload can carry.
      const data = JSON.parse(
        '{"constructor": [1, 2], "toString": [3, 4], "__proto__": [5, 6]}',
      );
      act(() => sub.emit({ data, offset: 0, isComplete: true }));

      expect(result.current[0]['constructor']).toEqual([1, 2]);
      expect(result.current[0]['toString']).toEqual([3, 4]);
      // '__proto__' is skipped rather than reparenting the accumulator.
      expect(Object.getPrototypeOf(result.current[0])).toBe(Object.prototype);
      expect(result.current[2].rowCount).toBe(2);
    });

    it('matches legacy cumulative payloads exactly when the host lacks incremental support', () => {
      // Exercise the real client end-to-end: the host ignores the capability
      // option and re-sends the entire accumulated data set on every page.
      const { result } = renderHook(() => useIncrementalElementData('el1'), {
        wrapper: withProvider(client),
      });

      const sendLegacyData = (data: Record<string, unknown[]>) => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              type: 'wb:plugin:element:el1:data',
              result: data,
              error: null,
            },
          }),
        );
      };

      act(() => sendLegacyData({ c1: [1, 2, 3] }));
      act(() => sendLegacyData({ c1: [1, 2, 3, 4, 5, 6] }));

      expect(result.current[0]).toEqual({ c1: [1, 2, 3, 4, 5, 6] });
      expect(result.current[2]).toEqual({ rowCount: 6, isComplete: false });
    });

    it('returns a loadMore callback that fetches more data', () => {
      stubSubscription<any>(
        client.elements,
        'subscribeToIncrementalElementData',
      );
      const fetchSpy = vi.spyOn(client.elements, 'fetchMoreElementData');
      const { result } = renderHook(() => useIncrementalElementData('el1'), {
        wrapper: withProvider(client),
      });
      act(() => result.current[1]());
      expect(fetchSpy).toHaveBeenCalledWith('el1');
    });

    it('does not subscribe and loadMore is a no-op when configId is falsy', () => {
      const subSpy = vi.spyOn(
        client.elements,
        'subscribeToIncrementalElementData',
      );
      const fetchSpy = vi.spyOn(client.elements, 'fetchMoreElementData');
      const { result } = renderHook(() => useIncrementalElementData(''), {
        wrapper: withProvider(client),
      });
      expect(subSpy).not.toHaveBeenCalled();
      act(() => result.current[1]());
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const sub = stubSubscription<any>(
        client.elements,
        'subscribeToIncrementalElementData',
      );
      const { unmount } = renderHook(() => useIncrementalElementData('el1'), {
        wrapper: withProvider(client),
      });
      unmount();
      expect(sub.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('useConfig', () => {
    it('returns the full config when no key is provided', () => {
      vi.spyOn(client.config, 'get').mockReturnValue({ a: 1 });
      const sub = stubSubscription<any>(client.config, 'subscribe');
      const { result } = renderHook(() => useConfig(), {
        wrapper: withProvider(client),
      });
      expect(result.current).toEqual({ a: 1 });

      act(() => sub.emit({ a: 2 }));
      expect(result.current).toEqual({ a: 2 });
    });

    it('returns the keyed value when a key is provided', () => {
      const getKeySpy = vi
        .spyOn(client.config, 'getKey')
        .mockImplementation(
          key =>
            (({ foo: 'bar' }) as Record<string, unknown>)[
              key as string
            ] as never,
        );
      const sub = stubSubscription<any>(client.config, 'subscribe');
      const { result } = renderHook(() => useConfig('foo'), {
        wrapper: withProvider(client),
      });
      expect(getKeySpy).toHaveBeenCalledWith('foo');
      expect(result.current).toBe('bar');

      act(() => sub.emit({ foo: 'baz' }));
      expect(result.current).toBe('baz');
    });
  });

  describe('useVariable', () => {
    it('returns the initial variable from getVariable', () => {
      const variable = {
        name: 'v1',
        defaultValue: { type: 'text', value: 'hi' },
      };
      const getSpy = vi
        .spyOn(client.config, 'getVariable')
        .mockReturnValue(variable as any);
      const { result } = renderHook(() => useVariable('v1'), {
        wrapper: withProvider(client),
      });
      expect(getSpy).toHaveBeenCalledWith('v1');
      expect(result.current[0]).toEqual(variable);
    });

    it('updates when the subscription emits', () => {
      const sub = stubSubscription<any>(
        client.config,
        'subscribeToWorkbookVariable',
      );
      const { result } = renderHook(() => useVariable('v1'), {
        wrapper: withProvider(client),
      });
      const next = { name: 'v1', defaultValue: { type: 'text', value: 'b' } };
      act(() => sub.emit(next));
      expect(result.current[0]).toEqual(next);
    });

    it('setter calls setVariable with id and values', () => {
      const setSpy = vi.spyOn(client.config, 'setVariable');
      const { result } = renderHook(() => useVariable('v1'), {
        wrapper: withProvider(client),
      });
      act(() => {
        result.current[1]('a', 'b');
      });
      expect(setSpy).toHaveBeenCalledWith('v1', 'a', 'b');
    });
  });

  describe('useUrlParameter', () => {
    it('returns the initial url parameter from getUrlParameter', () => {
      const getSpy = vi
        .spyOn(client.config, 'getUrlParameter')
        .mockReturnValue({ value: 'x' } as any);
      // Stub subscribe so its real impl does not immediately emit
      // the (empty) cached parameter and clobber the initial value.
      stubSubscription<any>(client.config, 'subscribeToUrlParameter');
      const { result } = renderHook(() => useUrlParameter('u1'), {
        wrapper: withProvider(client),
      });
      expect(getSpy).toHaveBeenCalledWith('u1');
      expect(result.current[0]).toEqual({ value: 'x' });
    });

    it('updates when the subscription emits', () => {
      const sub = stubSubscription<any>(
        client.config,
        'subscribeToUrlParameter',
      );
      const { result } = renderHook(() => useUrlParameter('u1'), {
        wrapper: withProvider(client),
      });
      act(() => sub.emit({ value: 'y' }));
      expect(result.current[0]).toEqual({ value: 'y' });
    });

    it('setter calls setUrlParameter', () => {
      const setSpy = vi.spyOn(client.config, 'setUrlParameter');
      const { result } = renderHook(() => useUrlParameter('u1'), {
        wrapper: withProvider(client),
      });
      act(() => result.current[1]('newVal'));
      expect(setSpy).toHaveBeenCalledWith('u1', 'newVal');
    });
  });

  describe('useInteraction', () => {
    it('updates state from the subscription', () => {
      const sub = stubSubscription<any>(
        client.config,
        'subscribeToWorkbookInteraction',
      );
      const { result } = renderHook(() => useInteraction('i1', 'el1'), {
        wrapper: withProvider(client),
      });
      expect(sub.spy).toHaveBeenCalledWith('i1', expect.any(Function));

      const selection = [{ col: { type: 'text', val: 1 } }];
      act(() => sub.emit(selection));
      expect(result.current[0]).toEqual(selection);
    });

    it('setter calls setInteraction with id, elementId, and value', () => {
      const setSpy = vi.spyOn(client.config, 'setInteraction');
      const { result } = renderHook(() => useInteraction('i1', 'el1'), {
        wrapper: withProvider(client),
      });
      const selection = [{ col: { type: 'text' } }];
      act(() => {
        (result.current[1] as (value: typeof selection) => void)(selection);
      });
      expect(setSpy).toHaveBeenCalledWith('i1', 'el1', selection);
    });
  });

  describe('useActionTrigger', () => {
    it('returns a callback that triggers the action', () => {
      const spy = vi.spyOn(client.config, 'triggerAction');
      const { result } = renderHook(() => useActionTrigger('a1'), {
        wrapper: withProvider(client),
      });
      act(() => result.current());
      expect(spy).toHaveBeenCalledWith('a1');
    });
  });

  describe('useActionEffect', () => {
    it('registers an effect for the given configId', () => {
      const spy = vi.spyOn(client.config, 'registerEffect');
      const effect = vi.fn();
      renderHook(() => useActionEffect('e1', effect), {
        wrapper: withProvider(client),
      });
      expect(spy).toHaveBeenCalledWith('e1', expect.any(Function));
    });

    it('re-registers with the latest effect when effect changes', () => {
      const spy = vi.spyOn(client.config, 'registerEffect');
      const first = vi.fn();
      const second = vi.fn();
      const { rerender } = renderHook(
        ({ fx }: { fx: () => void }) => useActionEffect('e1', fx),
        {
          wrapper: withProvider(client),
          initialProps: { fx: first },
        },
      );
      expect(spy).toHaveBeenCalledTimes(1);

      rerender({ fx: second });
      expect(spy).toHaveBeenCalledTimes(2);

      const lastRegistered = spy.mock.calls[spy.mock.calls.length - 1][1];
      lastRegistered();
      expect(second).toHaveBeenCalled();
      expect(first).not.toHaveBeenCalled();
    });

    it('unregisters the effect on unmount', () => {
      const unregister = vi.fn();
      vi.spyOn(client.config, 'registerEffect').mockReturnValue(unregister);
      const { unmount } = renderHook(() => useActionEffect('e1', vi.fn()), {
        wrapper: withProvider(client),
      });
      unmount();
      expect(unregister).toHaveBeenCalled();
    });
  });

  describe('usePluginStyle', () => {
    it('returns undefined initially and updates from style.get()', async () => {
      const { resolve, spy } = stubStyleGet(client);
      stubSubscription<any>(client.style, 'subscribe');
      const { result } = renderHook(() => usePluginStyle(), {
        wrapper: withProvider(client),
      });
      expect(result.current).toBeUndefined();
      expect(spy).toHaveBeenCalled();

      await act(async () => {
        resolve({ backgroundColor: '#FFFFFF' });
        await Promise.resolve();
      });
      expect(result.current).toEqual({ backgroundColor: '#FFFFFF' });
    });

    it('updates when style.subscribe emits', () => {
      stubStyleGet(client);
      const sub = stubSubscription<any>(client.style, 'subscribe');
      const { result } = renderHook(() => usePluginStyle(), {
        wrapper: withProvider(client),
      });
      act(() => sub.emit({ backgroundColor: '#000000' }));
      expect(result.current).toEqual({ backgroundColor: '#000000' });
    });
  });
});
