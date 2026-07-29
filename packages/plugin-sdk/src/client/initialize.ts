import {
  PluginConfig,
  PluginInstance,
  PluginMessageResponse,
  PluginStyle,
  UrlParameter,
  WorkbookElementData,
  WorkbookElementDataChunk,
  WorkbookSelection,
  WorkbookVariable,
} from '../types';
import { validateConfigId } from '../utils/error';

// Every value in a legacy cumulative WorkbookElementData payload is a column
// array, so typed non-array `offset`/`isComplete`/`data` fields can only come
// from the incremental chunk envelope. Offsets must be non-negative integers;
// a payload with a malformed offset is treated as legacy data rather than
// letting a NaN/negative/fractional value corrupt chunk assembly downstream.
function isElementDataChunk(
  result: WorkbookElementData | WorkbookElementDataChunk,
): result is WorkbookElementDataChunk {
  const chunk = result as Partial<WorkbookElementDataChunk>;
  return (
    result != null &&
    Number.isInteger(chunk.offset) &&
    (chunk.offset as number) >= 0 &&
    typeof chunk.isComplete === 'boolean' &&
    typeof chunk.data === 'object' &&
    chunk.data !== null &&
    !Array.isArray(chunk.data)
  );
}

export function initialize<T = {}>(): PluginInstance<T> {
  const pluginConfig: Partial<PluginConfig<T>> = {
    config: {} as T,
  };

  let subscribedInteractions: Record<string, WorkbookSelection[]> = {};
  let subscribedWorkbookVars: Record<string, WorkbookVariable> = {};
  let subscribedUrlParameters: Record<string, UrlParameter> = {};
  const registeredEffects: Record<string, () => void> = {};

  const listeners: {
    [event: string]: Function[];
  } = {};

  const location = new URL(document.location.href);
  for (const [key, value] of location.searchParams.entries()) {
    try {
      pluginConfig[key] = JSON.parse(value);
    } catch (_err: unknown) {
      if (__VITEST_BROWSER__ && (key === 'iframeId' || key === 'sessionId')) {
        // noop: vitest browser injects these into the test iframe URL
      } else {
        console.error(
          `Failed to parse URL param ${key} with value ${value} as JSON.`,
        );
      }
    }
  }

  const listener = (e: PluginMessageResponse) => {
    emit(e.data.type, e.data.result, e.data.error);
  };

  window.addEventListener('message', listener, false);
  window.addEventListener('click', () => execPromise('wb:plugin:focus'));

  on('wb:plugin:config:update', (config: PluginConfig<T>) => {
    Object.assign(pluginConfig, config);
    emit('config', pluginConfig.config ?? {});
  });

  // send initialize event
  void execPromise('wb:plugin:init', __VERSION__).then(config => {
    Object.assign(pluginConfig, config);
    emit('init', pluginConfig);
    emit('config', pluginConfig.config);
  });

  on(
    'wb:plugin:variable:update',
    (updatedVariables: Record<string, WorkbookVariable>) => {
      subscribedWorkbookVars = {};
      Object.assign(subscribedWorkbookVars, updatedVariables);
    },
  );

  on('wb:plugin:selection:update', (updatedInteractions: unknown) => {
    subscribedInteractions = {};
    Object.assign(subscribedInteractions, updatedInteractions);
  });

  on(
    'wb:plugin:url-parameter:update',
    (updatedUrlParameters: Record<string, UrlParameter>) => {
      subscribedUrlParameters = {};
      Object.assign(subscribedUrlParameters, updatedUrlParameters);
    },
  );

  on('wb:plugin:action-effect:invoke', (configId: string) => {
    const effect = registeredEffects[configId];
    if (!effect) {
      throw new Error(`Unknown action effect with name: ${configId}`);
    }
    effect();
  });

  function on(event: string, listener: Function) {
    listeners[event] = listeners[event] || [];
    listeners[event].push(listener);
  }

  function off(event: string, listener: Function) {
    if (listeners[event] == null) return;
    listeners[event] = listeners[event].filter(a => a !== listener);
  }

  function emit(event: string, ...args: any) {
    Object.values(listeners[event] || []).forEach(fn => fn(...args));
  }

  function execPromise<R>(event: string, ...args: any): Promise<R> {
    return new Promise((resolve, reject) => {
      const callback = (data: R, error: any) => {
        if (error) reject(error);
        else resolve(data);
        off(event, callback);
      };
      on(event, callback);
      window.parent.postMessage(
        { type: event, args, elementId: pluginConfig.id },
        pluginConfig?.wbOrigin ?? '*',
      );
    });
  }

  return {
    get sigmaEnv() {
      return pluginConfig.sigmaEnv;
    },

    get isScreenshot() {
      return pluginConfig.screenshot;
    },

    config: {
      // @ts-ignore TODO: Fix
      getKey(key) {
        return pluginConfig?.config?.[key];
      },
      get() {
        return pluginConfig.config;
      },
      set(partialConfig) {
        void execPromise('wb:plugin:config:update', partialConfig);
      },
      setKey(key, value) {
        void execPromise('wb:plugin:config:update', {
          [key]: value,
        });
      },
      subscribe(listener) {
        on('config', listener);
        return () => off('config', listener);
      },
      getVariable(configId: string) {
        validateConfigId(configId, 'variable');
        return subscribedWorkbookVars[configId];
      },
      setVariable(configId: string, ...values: unknown[]) {
        validateConfigId(configId, 'variable');
        void execPromise('wb:plugin:variable:set', configId, ...values);
      },
      getInteraction(configId: string) {
        validateConfigId(configId, 'interaction');
        return subscribedInteractions[configId];
      },
      setInteraction(
        configId: string,
        elementId: string,
        selection:
          | string[]
          | Array<Record<string, { type: string; val?: unknown }>>,
      ) {
        validateConfigId(configId, 'interaction');
        void execPromise(
          'wb:plugin:selection:set',
          configId,
          elementId,
          selection,
        );
      },
      triggerAction(configId: string) {
        validateConfigId(configId, 'action-trigger');
        void execPromise('wb:plugin:action-trigger:invoke', configId);
      },
      registerEffect(configId: string, effect: () => void) {
        validateConfigId(configId, 'action-effect');
        registeredEffects[configId] = effect;
        return () => {
          delete registeredEffects[configId];
        };
      },
      configureEditorPanel(options) {
        void execPromise('wb:plugin:config:inspector', options);
      },
      setLoadingState(loadingState) {
        void execPromise('wb:plugin:config:loading-state', loadingState);
      },
      subscribeToWorkbookVariable(configId, callback) {
        validateConfigId(configId, 'variable');
        const setValues = (values: Record<string, WorkbookVariable>) => {
          callback(values[configId]);
        };
        on('wb:plugin:variable:update', setValues);
        return () => {
          off('wb:plugin:variable:update', setValues);
        };
      },
      subscribeToWorkbookInteraction(configId, callback) {
        validateConfigId(configId, 'interaction');
        const setValues = (values: Record<string, WorkbookSelection[]>) => {
          callback(values[configId]);
        };
        on('wb:plugin:selection:update', setValues);
        return () => {
          off('wb:plugin:selection:update', setValues);
        };
      },
      subscribeToUrlParameter(configId, callback) {
        validateConfigId(configId, 'url-parameter');
        const setValues = (values: Record<string, UrlParameter>) => {
          callback(values[configId]);
        };
        setValues(subscribedUrlParameters);
        on('wb:plugin:url-parameter:update', setValues);
        return () => {
          off('wb:plugin:url-parameter:update', setValues);
        };
      },
      getUrlParameter(configId: string) {
        validateConfigId(configId, 'url-parameter');
        return subscribedUrlParameters[configId];
      },
      setUrlParameter(configId: string, value: string) {
        validateConfigId(configId, 'url-parameter');
        void execPromise('wb:plugin:url-parameter:set', configId, value);
      },
    },
    elements: {
      getElementColumns(configId) {
        validateConfigId(configId, 'element');
        return execPromise('wb:plugin:element:columns:get', configId);
      },
      subscribeToElementColumns(configId, callback) {
        validateConfigId(configId, 'element');
        const eventName = `wb:plugin:element:${configId}:columns`;
        on(eventName, callback);
        void execPromise('wb:plugin:element:subscribe:columns', configId);

        return () => {
          off(eventName, callback);
          void execPromise('wb:plugin:element:unsubscribe:columns', configId);
        };
      },
      subscribeToElementData(configId, callback) {
        validateConfigId(configId, 'element');
        const eventName = `wb:plugin:element:${configId}:data`;
        on(eventName, callback);
        void execPromise('wb:plugin:element:subscribe:data', configId);

        return () => {
          off(eventName, callback);
          void execPromise('wb:plugin:element:unsubscribe:data', configId);
        };
      },
      subscribeToIncrementalElementData(configId, callback) {
        validateConfigId(configId, 'element');
        const eventName = `wb:plugin:element:${configId}:data`;
        const onData = (
          result: WorkbookElementData | WorkbookElementDataChunk,
        ) => {
          if (isElementDataChunk(result)) {
            callback(result);
          } else {
            // A host without incremental support ignores the subscribe
            // options and keeps sending cumulative payloads. Deliver those as
            // replace-everything chunks so consumers behave identically
            // against either host. Legacy hosts never signal completion, so
            // isComplete stays false.
            callback({ data: result, offset: 0, isComplete: false });
          }
        };
        on(eventName, onData);
        void execPromise('wb:plugin:element:subscribe:data', configId, {
          mode: 'incremental',
        });

        return () => {
          off(eventName, onData);
          void execPromise('wb:plugin:element:unsubscribe:data', configId);
        };
      },
      fetchMoreElementData(configId) {
        validateConfigId(configId, 'element');
        void execPromise('wb:plugin:element:fetch-more', configId);
      },
    },

    style: {
      subscribe(callback: (style: PluginStyle) => void) {
        on('wb:plugin:style:update', callback);
        return () => off('wb:plugin:style:update', callback);
      },

      get() {
        return execPromise('wb:plugin:style:get');
      },
    },

    destroy() {
      Object.keys(listeners).forEach(event => delete listeners[event]);
      window.removeEventListener('message', listener, false);
    },
  };
}
