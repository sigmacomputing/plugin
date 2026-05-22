import * as React from 'react';

import {
  PluginInstance,
  CustomPluginConfigOptions,
  WorkbookElementColumns,
  WorkbookElementData,
  WorkbookSelection,
  WorkbookVariable,
  PluginStyle,
  UrlParameter,
} from '@sigmacomputing/plugin';

import { PluginContext } from './Context';
import { deepEqual } from './deepEqual';

/**
 * Gets the entire plugin instance
 * @returns {PluginInstance} Context for the current plugin instance
 */
export function usePlugin(): PluginInstance<any> {
  return React.useContext(PluginContext);
}

/**
 * Provides a setter for the Plugin's Config Options
 * @param {CustomPluginConfigOptions[]} nextOptions Updated possible Config Options
 */
export function useEditorPanelConfig(
  nextOptions: CustomPluginConfigOptions[],
): void {
  const client = usePlugin();
  const optionsRef = React.useRef({});

  React.useEffect(() => {
    if (nextOptions == null) return;
    if (!deepEqual(nextOptions, optionsRef.current)) {
      client.config.configureEditorPanel(nextOptions);
      optionsRef.current = nextOptions;
    }
  }, [client, nextOptions]);
}

/**
 * React hook for Plugin Config loading state
 * @param {boolean} initialState Initial value to set loading state to
 * @returns {[boolean, Function]} Boolean value corresponding to loading state for plugin config and setter for loading state
 */
export function useLoadingState(
  initialState: boolean,
): [boolean, (nextState: boolean) => void] {
  const client = usePlugin();
  const [loading, setLoading] = React.useState(() => {
    client.config.setLoadingState(initialState);
    return initialState;
  });

  return [
    loading,
    nextState => {
      if (nextState === loading) return;
      setLoading(nextState);
      client.config.setLoadingState(nextState);
    },
  ];
}

/**
 * Provides the latest column values from corresponding config element
 * @param {string} configId ID from the config for fetching element columns, with type: 'element'
 * @returns {WorkbookElementColumns} Values of corresponding columns contained
 * within the config element
 */
export function useElementColumns(configId: string): WorkbookElementColumns {
  const client = usePlugin();
  const [columns, setColumns] = React.useState<WorkbookElementColumns>({});

  React.useEffect(() => {
    if (configId) {
      return client.elements.subscribeToElementColumns(configId, setColumns);
    }
  }, [client, configId]);

  return columns;
}

/**
 * Provides the latest data values from config element (max 25_000)
 * @param {string} configId ID from the config for fetching element data, with type: 'element'
 * @returns {WorkbookElementData} Element Data for config element, if any
 */
export function useElementData(configId: string): WorkbookElementData {
  const client = usePlugin();
  const [data, setData] = React.useState<WorkbookElementData>({});

  React.useEffect(() => {
    if (configId) {
      return client.elements.subscribeToElementData(configId, setData);
    }
  }, [client, configId]);

  return data;
}

/**
 * Provides the latest data values from corresponding config element with a callback to
 * fetch more in chunks of 25_000 data points
 * @param {string} configId ID from the config for fetching paginated
 * element data, with type: 'element'
 * @returns {WorkbookElementData} Element Data for configured config element, if any
 */
export function usePaginatedElementData(
  configId: string,
): [WorkbookElementData, () => void] {
  const client = usePlugin();
  const [data, setData] = React.useState<WorkbookElementData>({});

  const loadMore = React.useCallback(() => {
    if (configId) {
      client.elements.fetchMoreElementData(configId);
    }
  }, [configId, client.elements]);

  React.useEffect(() => {
    if (configId) {
      return client.elements.subscribeToElementData(configId, setData);
    }
  }, [client, configId]);

  return [data, loadMore];
}

/**
 * Provides the latest value for entire config or certain key within the config
 * @param {string} key Key within Plugin Config, optional
 * @returns Entire config if no key passed in or value for key within plugin config
 */
export function useConfig(key?: string): any {
  const client = usePlugin();
  const [config, setConfig] = React.useState<any>(
    key != null ? client.config.getKey(key) : client.config.get(),
  );

  React.useEffect(
    () =>
      client.config.subscribe(newConfig => {
        if (key != null && newConfig[key] !== config[key]) {
          setConfig(newConfig[key]);
        } else {
          setConfig(newConfig);
        }
      }),
    [client, key, config],
  );

  return config;
}

/**
 * React hook for accessing a workbook control variable
 * @param {string} id ID from the config of type: 'variable'
 * @returns {[(WorkbookVariable | undefined), Function]} Constantly updating
 * value of the control variable and setter for the variable
 */
export function useVariable(
  id: string,
): [WorkbookVariable | undefined, Function] {
  const client = usePlugin();
  const [workbookVariable, setWorkbookVariable] =
    React.useState<WorkbookVariable>();

  const isFirstRender = React.useRef<boolean>(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      setWorkbookVariable(client.config.getVariable(id));
      isFirstRender.current = false;
    }
    return client.config.subscribeToWorkbookVariable(id, setWorkbookVariable);
  }, [client, id]);

  const setVariable = React.useCallback(
    (...values: unknown[]) => client.config.setVariable(id, ...values),
    [id, client.config],
  );

  return [workbookVariable, setVariable];
}

/**
 * React hook for accessing a url parameter
 * @param {string} id ID from the config of type: 'url-parameter'
 * @returns {[(UrlParameter | undefined), Function]} Constantly updating value of the url parameter and setter for the url parameter
 */
export function useUrlParameter(
  id: string,
): [UrlParameter | undefined, (value: string) => void] {
  const client = usePlugin();
  const [urlParameter, setUrlParameter] = React.useState<UrlParameter>();

  const isFirstRender = React.useRef<boolean>(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      setUrlParameter(client.config.getUrlParameter(id));
      isFirstRender.current = false;
    }
    return client.config.subscribeToUrlParameter(id, setUrlParameter);
  }, [client, id]);

  const setter = React.useCallback(
    (value: string) => client.config.setUrlParameter(id, value),
    [client, id],
  );

  return [urlParameter, setter];
}

/**
 * @deprecated Use Action API instead
 * React hook for accessing a workbook interaction selections state
 * @param {string} id ID from the config of type: 'interaction'
 * @returns {[(WorkbookSelection | undefined), Function]} Constantly updating selection state and setter thereof
 */
export function useInteraction(
  id: string,
  elementId: string,
): [unknown, Function] {
  const client = usePlugin();
  const [workbookInteraction, setWorkbookInteraction] =
    React.useState<WorkbookSelection[]>();

  React.useEffect(() => {
    return client.config.subscribeToWorkbookInteraction(
      id,
      setWorkbookInteraction,
    );
  }, [client, id]);

  const setInteraction = React.useCallback(
    (value: WorkbookSelection[]) => {
      client.config.setInteraction(id, elementId, value);
    },
    [id, elementId, client.config],
  );

  return [workbookInteraction, setInteraction];
}

/**
 * React hook for returning a triggering callback function for the registered
 * action trigger
 * @param {string} configId ID from the config of type: 'action-trigger'
 * @returns {Function} A callback function to trigger the action
 */
export function useActionTrigger(configId: string): () => void {
  const client = usePlugin();

  return React.useCallback(() => {
    client.config.triggerAction(configId);
  }, [client, configId]);
}

/**
 * React hook for registering and unregistering an action effect
 * @param {string} configId ID from the config of type: 'action-effect'
 * @param {Function} effect The function to be called when the action is triggered
 */
export function useActionEffect(configId: string, effect: () => void) {
  const client = usePlugin();

  const effectRef = React.useRef(effect);

  React.useEffect(() => {
    effectRef.current = effect;
  });

  React.useEffect(() => {
    return client.config.registerEffect(configId, effectRef.current);
  }, [client, configId, effect]);
}

/**
 * React hook for accessing plugin style with live updates
 * @returns {PluginStyle | undefined} Style properties from the workbook if available
 */
export function usePluginStyle(): PluginStyle | undefined {
  const client = usePlugin();
  const [style, setStyle] = React.useState<PluginStyle | undefined>();

  React.useEffect(() => {
    // Request initial style data on mount and subscribe to updates
    void client.style.get().then(response => setStyle(response));
    return client.style.subscribe(setStyle);
  }, [client]);

  return style;
}
