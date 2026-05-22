import {
  PluginConfig,
  PluginInstance,
  PluginMessageResponse,
  PluginStyle,
  UrlParameter,
  WorkbookSelection,
  WorkbookVariable,
} from '../types';
import { validateConfigId } from '../utils/error';

export class PluginClient<T = {}> implements PluginInstance<T> {
  private pluginConfig: Partial<PluginConfig<T>> = { config: {} as T };

  private subscribedInteractions: Record<string, WorkbookSelection[]> = {};
  private subscribedWorkbookVars: Record<string, WorkbookVariable> = {};
  private subscribedUrlParameters: Record<string, UrlParameter> = {};
  private readonly registeredEffects: Record<string, () => void> = {};
  private readonly listeners: { [event: string]: Function[] } = {};
  private readonly messageListener: (e: PluginMessageResponse) => void;

  readonly config: PluginInstance<T>['config'];
  readonly elements: PluginInstance<T>['elements'];
  readonly style: PluginInstance<T>['style'];

  constructor() {
    this.messageListener = e =>
      this.emit(e.data.type, e.data.result, e.data.error);

    this.parseUrlParams();

    window.addEventListener('message', this.messageListener, false);
    window.addEventListener('click', () => this.execPromise('wb:plugin:focus'));

    this.on('wb:plugin:config:update', (config: PluginConfig<T>) => {
      Object.assign(this.pluginConfig, config);
      this.emit('config', this.pluginConfig.config ?? {});
    });

    // send initialize event
    void this.execPromise('wb:plugin:init', __VERSION__).then(config => {
      Object.assign(this.pluginConfig, config);
      this.emit('init', this.pluginConfig);
      this.emit('config', this.pluginConfig.config);
    });

    this.on(
      'wb:plugin:variable:update',
      (updatedVariables: Record<string, WorkbookVariable>) => {
        this.subscribedWorkbookVars = {};
        Object.assign(this.subscribedWorkbookVars, updatedVariables);
      },
    );

    this.on('wb:plugin:selection:update', (updatedInteractions: unknown) => {
      this.subscribedInteractions = {};
      Object.assign(this.subscribedInteractions, updatedInteractions);
    });

    this.on(
      'wb:plugin:url-parameter:update',
      (updatedUrlParameters: Record<string, UrlParameter>) => {
        this.subscribedUrlParameters = {};
        Object.assign(this.subscribedUrlParameters, updatedUrlParameters);
      },
    );

    this.on('wb:plugin:action-effect:invoke', (configId: string) => {
      const effect = this.registeredEffects[configId];
      if (!effect) {
        throw new Error(`Unknown action effect with name: ${configId}`);
      }
      effect();
    });

    this.config = {
      // @ts-ignore TODO: Fix
      getKey: key => this.pluginConfig?.config?.[key],
      get: () => this.pluginConfig.config,
      set: partialConfig => {
        void this.execPromise('wb:plugin:config:update', partialConfig);
      },
      setKey: (key, value) => {
        void this.execPromise('wb:plugin:config:update', {
          [key]: value,
        });
      },
      subscribe: listener => {
        this.on('config', listener);
        return () => this.off('config', listener);
      },
      getVariable: (configId: string) => {
        validateConfigId(configId, 'variable');
        return this.subscribedWorkbookVars[configId];
      },
      setVariable: (configId: string, ...values: unknown[]) => {
        validateConfigId(configId, 'variable');
        void this.execPromise('wb:plugin:variable:set', configId, ...values);
      },
      getInteraction: (configId: string) => {
        validateConfigId(configId, 'interaction');
        return this.subscribedInteractions[configId];
      },
      setInteraction: (
        configId: string,
        elementId: string,
        selection:
          | string[]
          | Array<Record<string, { type: string; val?: unknown }>>,
      ) => {
        validateConfigId(configId, 'interaction');
        void this.execPromise(
          'wb:plugin:selection:set',
          configId,
          elementId,
          selection,
        );
      },
      triggerAction: (configId: string) => {
        validateConfigId(configId, 'action-trigger');
        void this.execPromise('wb:plugin:action-trigger:invoke', configId);
      },
      registerEffect: (configId: string, effect: () => void) => {
        validateConfigId(configId, 'action-effect');
        this.registeredEffects[configId] = effect;
        return () => {
          delete this.registeredEffects[configId];
        };
      },
      configureEditorPanel: options => {
        void this.execPromise('wb:plugin:config:inspector', options);
      },
      setLoadingState: loadingState => {
        void this.execPromise('wb:plugin:config:loading-state', loadingState);
      },
      subscribeToWorkbookVariable: (configId, callback) => {
        validateConfigId(configId, 'variable');
        const setValues = (values: Record<string, WorkbookVariable>) => {
          callback(values[configId]);
        };
        this.on('wb:plugin:variable:update', setValues);
        return () => {
          this.off('wb:plugin:variable:update', setValues);
        };
      },
      subscribeToWorkbookInteraction: (configId, callback) => {
        validateConfigId(configId, 'interaction');
        const setValues = (values: Record<string, WorkbookSelection[]>) => {
          callback(values[configId]);
        };
        this.on('wb:plugin:selection:update', setValues);
        return () => {
          this.off('wb:plugin:selection:update', setValues);
        };
      },
      subscribeToUrlParameter: (configId, callback) => {
        validateConfigId(configId, 'url-parameter');
        const setValues = (values: Record<string, UrlParameter>) => {
          callback(values[configId]);
        };
        setValues(this.subscribedUrlParameters);
        this.on('wb:plugin:url-parameter:update', setValues);
        return () => {
          this.off('wb:plugin:url-parameter:update', setValues);
        };
      },
      getUrlParameter: (configId: string) => {
        validateConfigId(configId, 'url-parameter');
        return this.subscribedUrlParameters[configId];
      },
      setUrlParameter: (configId: string, value: string) => {
        validateConfigId(configId, 'url-parameter');
        void this.execPromise('wb:plugin:url-parameter:set', configId, value);
      },
    };

    this.elements = {
      getElementColumns: configId => {
        validateConfigId(configId, 'element');
        return this.execPromise('wb:plugin:element:columns:get', configId);
      },
      subscribeToElementColumns: (configId, callback) => {
        validateConfigId(configId, 'element');
        const eventName = `wb:plugin:element:${configId}:columns`;
        this.on(eventName, callback);
        void this.execPromise('wb:plugin:element:subscribe:columns', configId);

        return () => {
          this.off(eventName, callback);
          void this.execPromise(
            'wb:plugin:element:unsubscribe:columns',
            configId,
          );
        };
      },
      subscribeToElementData: (configId, callback) => {
        validateConfigId(configId, 'element');
        const eventName = `wb:plugin:element:${configId}:data`;
        this.on(eventName, callback);
        void this.execPromise('wb:plugin:element:subscribe:data', configId);

        return () => {
          this.off(eventName, callback);
          void this.execPromise(
            'wb:plugin:element:unsubscribe:data',
            configId,
          );
        };
      },
      fetchMoreElementData: configId => {
        validateConfigId(configId, 'element');
        void this.execPromise('wb:plugin:element:fetch-more', configId);
      },
    };

    this.style = {
      subscribe: (callback: (style: PluginStyle) => void) => {
        this.on('wb:plugin:style:update', callback);
        return () => this.off('wb:plugin:style:update', callback);
      },
      get: () => {
        return this.execPromise('wb:plugin:style:get');
      },
    };
  }

  get sigmaEnv() {
    return this.pluginConfig.sigmaEnv;
  }

  get isScreenshot() {
    return this.pluginConfig.screenshot;
  }

  destroy() {
    Object.keys(this.listeners).forEach(event => delete this.listeners[event]);
    window.removeEventListener('message', this.messageListener, false);
  }

  private parseUrlParams() {
    const location = new URL(document.location.href);
    for (const [key, value] of location.searchParams.entries()) {
      try {
        this.pluginConfig[key] = JSON.parse(value);
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
  }

  private on(event: string, listener: Function) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(listener);
  }

  private off(event: string, listener: Function) {
    if (this.listeners[event] == null) return;
    this.listeners[event] = this.listeners[event].filter(a => a !== listener);
  }

  private emit(event: string, ...args: any) {
    Object.values(this.listeners[event] || []).forEach(fn => fn(...args));
  }

  private execPromise<R>(event: string, ...args: any): Promise<R> {
    return new Promise((resolve, reject) => {
      const callback = (data: R, error: any) => {
        if (error) reject(error);
        else resolve(data);
        this.off(event, callback);
      };
      this.on(event, callback);
      window.parent.postMessage(
        { type: event, args, elementId: this.pluginConfig.id },
        this.pluginConfig?.wbOrigin ?? '*',
      );
    });
  }
}

export function initialize<T = {}>(): PluginInstance<T> {
  return new PluginClient<T>();
}
