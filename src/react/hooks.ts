import { useContext, useEffect, useCallback, useRef, useState } from 'react';

import { PluginContext } from './Context';
import {
  PluginInstance,
  CustomPluginConfigOptions,
  WorkbookElementColumns,
  WorkbookElementData,
  WorkbookSelection,
  WorkbookVariable,
} from '../types';
import { deepEqual } from '../utils/deepEqual';

/**
 * Gets the entire plugin instance
 * @returns {PluginInstance} Context for the current plugin instance
 */
export function usePlugin(): PluginInstance<any> {
  return useContext(PluginContext);
}

/**
 * Provides a setter for the Plugin's Config Options
 * @param {CustomPluginConfigOptions[]} nextOptions Updated possible Config Options
 */
export function useEditorPanelConfig(
  nextOptions: CustomPluginConfigOptions[],
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
 * @returns {WorkbookElementColumns} Values of corresponding columns contained within the sheet
 */
export function useElementColumns(id: string): WorkbookElementColumns {
  const client = usePlugin();
  const [columns, setColumns] = useState<WorkbookElementColumns>({});

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
 * @returns {WorkbookElementData} Element Data for corresponding sheet, if any
 */
export function useElementData(id: string): WorkbookElementData {
  const client = usePlugin();
  const [data, setData] = useState<WorkbookElementData>({});

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
 * @returns {[(WorkbookVariable | undefined), Function]} Constantly updating value of the variable and setter for the variable
 */
export function useVariable(
  id: string,
): [WorkbookVariable | undefined, Function] {
  const client = usePlugin();
  const [workbookVariable, setWorkbookVariable] = useState<WorkbookVariable>();

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
 * @returns {[(WorkbookSelection | undefined), Function]} Constantly updating selection state and setter thereof
 */
export function useInteraction(
  id: string,
  elementId: string,
): [unknown, Function] {
  const client = usePlugin();
  const [workbookInteraction, setWorkbookInteraction] =
    useState<WorkbookSelection[]>();

  useEffect(() => {
    return client.config.subscribeToWorkbookInteraction(
      id,
      setWorkbookInteraction,
    );
  }, [client, id]);

  const setInteraction = useCallback(
    (value: WorkbookSelection[]) => {
      client.config.setInteraction(id, elementId, value);
    },
    [id],
  );

  return [workbookInteraction, setInteraction];
}

/**
 * React hook for registering a action trigger and returning a triggering function
 * @param {string} id ID of action trigger
 * @returns {Function} Function to trigger the registered action
 */

export function useActionTrigger(id: string): Function {
  const client = usePlugin();

  client.config.registerActionTrigger(id, () => {});

  return useCallback(() => {
    client.config.triggerAction(id);
  }, [client, id]);
}
