import type { ReactNode } from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
} from 'react';

import { client } from '../client';
import { deepEqual } from '../deepEqual';
import * as plugin from '../types';

export * from '../types';

const PluginContext = createContext<plugin.PluginInstance<any>>(client);

/**
 * Wrapper for plugin client using a Provider
 * @param {{client: plugin.PluginInstance, children: ReactNode}} props Plugin instance and any children elements
 * @returns {JSXElement} Context Provider for passed in props
 */
export function SigmaClientProvider(props: {
  client: plugin.PluginInstance<any>;
  children?: ReactNode;
}) {
  return (
    <PluginContext.Provider value={props.client}>
      {props.children}
    </PluginContext.Provider>
  );
}

/**
 * Gets the entire plugin instance
 * @returns {plugin.PluginInstance} Context for the current plugin instance
 */
export function usePlugin(): plugin.PluginInstance<any> {
  return useContext(PluginContext);
}

/**
 * Provides a setter for the Plugin's Config Options
 * @param {plugin.CustomPluginConfigOptions[]} nextOptions Updated possible Config Options
 */
export function useEditorPanelConfig(
  nextOptions: plugin.CustomPluginConfigOptions[],
): void {
  const client = usePlugin();
  const optionsRef = useRef({});

  useEffect(() => {
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
  const [loading, setLoading] = useState(() => {
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
 * Provides the latest column values from corresponding sheet
 * @param {string} id Sheet ID to retrieve from workbook
 * @returns {plugin.WbElementColumns} Values of corresponding columns contained within the sheet
 */
export function useElementColumns(id: string): plugin.WbElementColumns {
  const client = usePlugin();
  const [columns, setColumns] = useState<plugin.WbElementColumns>({});

  useEffect(() => {
    if (id) {
      return client.elements.subscribeToElementColumns(id, setColumns);
    }
  }, [client, id]);

  return columns;
}

/**
 * Provides the latest data values from corresponding sheet
 * @param {string} id Sheet ID to get element data from
 * @returns {plugin.WbElementData} Element Data for corresponding sheet, if any
 */
export function useElementData(id: string): plugin.WbElementData {
  const client = usePlugin();
  const [data, setData] = useState<plugin.WbElementData>({});

  useEffect(() => {
    if (id) {
      return client.elements.subscribeToElementData(id, setData);
    }
  }, [client, id]);

  return data;
}

/**
 * Provides the latest value for entire config or certain key within the config
 * @param {string} key Key within Plugin Config, optional
 * @returns Entire config if no key passed in or value for key within plugin config
 */
export function useConfig(key?: string): any {
  const client = usePlugin();
  const [config, setConfig] = useState<any>(
    key != null ? client.config.getKey(key) : client.config.get(),
  );

  useEffect(
    () =>
      client.config.subscribe(newConfig => {
        if (key != null && newConfig[key] !== config[key]) {
          setConfig(newConfig[key]);
        } else {
          setConfig(newConfig);
        }
      }),
    [client],
  );

  return config;
}

/**
 * React hook for accessing a workbook variable
 * @param {string} id ID of variable within Plugin Config to use
 * @returns {[(plugin.WorkbookVariable | undefined), Function]} Constantly updating value of the variable and setter for the variable
 */
export function useVariable(
  id: string,
): [plugin.WorkbookVariable | undefined, Function] {
  const client = usePlugin();
  const [workbookVariable, setWorkbookVariable] =
    useState<plugin.WorkbookVariable>();

  useEffect(() => {
    return client.config.subscribeToWorkbookVariable(id, setWorkbookVariable);
  }, [client, id]);

  const setVariable = useCallback(
    (...values: unknown[]) => client.config.setVariable(id, ...values),
    [id],
  );

  return [workbookVariable, setVariable];
}

/**
 * React hook for accessing a workbook interaction selections state
 * @param {string} id ID of variable within Plugin Config to use
 * @returns {[(plugin.WorkbookSelection | undefined), Function]} Constantly updating selection state and setter thereof
 */
export function useInteraction(
  id: string,
  elementId: string,
): [unknown, Function] {
  const client = usePlugin();
  const [workbookInteraction, setWorkbookInteraction] =
    useState<plugin.WorkbookSelection[]>();

  useEffect(() => {
    return client.config.subscribeToWorkbookInteraction(
      id,
      setWorkbookInteraction,
    );
  }, [client, id]);

  const setInteraction = useCallback(
    (value: plugin.WorkbookSelection[]) => {
      client.config.setInteraction(id, elementId, value);
    },
    [id],
  );

  return [workbookInteraction, setInteraction];
}
