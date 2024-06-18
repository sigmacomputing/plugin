import {
  PluginConfig,
  PluginInstance,
  PluginMessageResponse,
  WorkbookSelection,
  WorkbookVariable,
  Unsubscriber,
} from '../types';

export function initialize<T = {}>(): PluginInstance<T> {
  const pluginConfig: Partial<PluginConfig<T>> = {
    config: {} as T,
  };

  let subscribedInteractions: Record<string, WorkbookSelection[]> = {};
  let subscribedWorkbookVars: Record<string, WorkbookVariable> = {};
  let actionTriggers: Record<string, Function> = {};

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
      getVariable(id: string): WorkbookVariable {
        return subscribedWorkbookVars[id];
      },
      setVariable(id: string, ...values: unknown[]) {
        void execPromise('wb:plugin:variable:set', id, ...values);
      },
      getInteraction(id: string) {
        return subscribedInteractions[id];
      },
      setInteraction(
        id: string,
        elementId: string,
        selection:
          | string[]
          | Array<Record<string, { type: string; val?: unknown }>>,
      ) {
        void execPromise('wb:plugin:selection:set', id, elementId, selection);
      },
      configureEditorPanel(options) {
        void execPromise('wb:plugin:config:inspector', options);
      },
      setLoadingState(loadingState) {
        void execPromise('wb:plugin:config:loading-state', loadingState);
      },
      registerActionTrigger(id: string, callback: Function) {
        actionTriggers[id] = callback;
      },
      triggerAction(id: string) {
        const trigger = actionTriggers[id];
        // might not even need this function, cuz just send a message
        if (trigger) {
          trigger();
        }
        execPromise('wb:plugin:trigger:set', id);
      },
      // getActionTrigger(id: string): Function {
      //   return actionTriggers[id];
      // },
      // setActionTrigger(id: string, triggerFunction: Function): void {
      //   actionTriggers[id] = triggerFunction;
      //   void execPromise('wb:plugin:actiontrigger:set', id, triggerFunction);
      // },
      subscribeToWorkbookVariable(
        id: string,
        callback: (input: WorkbookVariable) => void,
      ): Unsubscriber {
        const setValues = (values: Record<string, WorkbookVariable>) => {
          callback(values[id]);
        };
        on('wb:plugin:variable:update', setValues);
        return () => {
          off('wb:plugin:variable:update', setValues);
        };
      },
      subscribeToWorkbookInteraction(
        id: string,
        callback: (input: WorkbookSelection[]) => void,
      ): Unsubscriber {
        const setValues = (values: Record<string, WorkbookSelection[]>) => {
          callback(values[id]);
        };
        on('wb:plugin:selection:update', setValues);
        return () => {
          off('wb:plugin:selection:update', setValues);
        };
      },
    },
    elements: {
      getElementColumns(id) {
        return execPromise('wb:plugin:element:columns:get', id);
      },
      subscribeToElementColumns(id, callback) {
        const eventName = `wb:plugin:element:${id}:columns`;
        on(eventName, callback);
        void execPromise('wb:plugin:element:subscribe:columns', id);

        return () => {
          off(eventName, callback);
          void execPromise('wb:plugin:element:unsubscribe:columns', id);
        };
      },
      subscribeToElementData(id, callback) {
        const eventName = `wb:plugin:element:${id}:data`;
        on(eventName, callback);
        void execPromise('wb:plugin:element:subscribe:data', id);

        return () => {
          off(eventName, callback);
          void execPromise('wb:plugin:element:unsubscribe:data', id);
        };
      },
    },
    destroy() {
      Object.keys(listeners).forEach(event => delete listeners[event]);
      window.removeEventListener('message', listener, false);
    },
  };
}
