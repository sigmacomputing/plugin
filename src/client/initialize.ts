import { validateConfigId } from '../error';
import {
  PluginConfig,
  PluginInstance,
  PluginMessageResponse,
  WorkbookSelection,
  WorkbookVariable,
} from '../types';

export function initialize<T = {}>(): PluginInstance<T> {
  const pluginConfig: Partial<PluginConfig<T>> = {
    config: {} as T,
  };

  let subscribedInteractions: Record<string, WorkbookSelection[]> = {};
  let subscribedWorkbookVars: Record<string, WorkbookVariable> = {};
  const registeredEffects: Record<
    string,
    (data?: Record<string, any>) => void
  > = {};

  const listeners: {
    [event: string]: Function[];
  } = {};

  for (const [key, value] of new URL(
    document.location.toString(),
  ).searchParams.entries())
    pluginConfig[key] = JSON.parse(value);

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
  void execPromise(
    'wb:plugin:init',
    require('../../package.json').version,
  ).then(config => {
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
    'wb:plugin:action-effect:invoke',
    (payload: { configId: string; data?: Record<string, any> } | string) => {
      // Support both old format (string) and new format (object with effectId and data)
      const configId = typeof payload === 'string' ? payload : payload.configId;
      const data = typeof payload === 'object' ? payload.data : undefined;

      const effect = registeredEffects[configId];
      if (!effect) {
        throw new Error(`Unknown action effect with name: ${configId}`);
      }
      effect(data);
    },
  );

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
      // @ts-ignore
      getKey(key) {
        return pluginConfig?.config?.[key]!;
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
      triggerAction(configId: string, data?: Record<string, any>) {
        validateConfigId(configId, 'action-trigger');
        void execPromise('wb:plugin:action-trigger:invoke', configId, data);
      },
      registerEffect(
        configId: string,
        effect: (data?: Record<string, any>) => void,
      ) {
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
      fetchMoreElementData(configId) {
        validateConfigId(configId, 'element');
        void execPromise('wb:plugin:element:fetch-more', configId);
      },
    },

    style: {
      subscribeToStyle(callback: (style: any) => void) {
        on('wb:plugin:style:update', callback);
        return () => off('wb:plugin:style:update', callback);
      },

      getStyle() {
        return execPromise('wb:plugin:style:get');
      },
    },

    destroy() {
      Object.keys(listeners).forEach(event => delete listeners[event]);
      window.removeEventListener('message', listener, false);
    },
  };
}
