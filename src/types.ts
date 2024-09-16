export type ScalarType = 'boolean' | 'datetime' | 'number' | 'integer' | 'text';
export type PrimitiveType = ScalarType | 'variant' | 'link';
export type ValueType = PrimitiveType | 'error';

/**
 * All mutable workbook control variable types
 */
export type ControlType =
  | 'boolean'
  | 'date'
  | 'number'
  | 'text'
  | 'text-list'
  | 'number-list'
  | 'date-list'
  | 'number-range'
  | 'date-range';

export interface PluginConfig<T> {
  id: string;
  config: T;
  screenshot: boolean;
  [key: string]: any;
}

/**
 * @typedef {object} WorkbookVariable
 * @property {string} name Name of Control Variable within Workbook
 * @property {{string}} defaultValue Current Value containing at least type as string
 */
export interface WorkbookVariable {
  name: string;
  defaultValue: { type: string };
}

export type WorkbookSelection = Record<string, { type: string; val?: unknown }>;

export type PluginMessageResponse = MessageEvent<{
  type: string;
  result: any[];
  error: any;
}>;

export interface WbElement {
  id: string;
}

/**
 * @typedef {object} WorkbookElementData
 * @property {Object<string, any>} data Workbook data sorted by column ID
 */
export interface WorkbookElementData {
  [colId: string]: any[];
}

/**
 * Column data
 * @typedef {object} WorkbookElementColumn
 * @property {string} id Column ID
 * @property {string} name Column Name
 * @property {string} columnType Type of data contained within column
 */
export interface WorkbookElementColumn {
  id: string;
  name: string;
  columnType: ValueType;
}

/**
 * Record of Column data with corresponding IDs
 * @typedef {object} WorkbookElementColumns
 * @property {Object<string, WorkbookElementColumn>} column Column ID and corresponding column data
 */
export interface WorkbookElementColumns {
  [colId: string]: WorkbookElementColumn;
}

/**
 * Function to Unsubscribe from the corresponding elements
 * @typedef {() => void} Unsubscriber
 */
export type Unsubscriber = () => void;

/**
 * Different types Plugin Config Options
 * @typedef {object} CustomPluginConfigOptions
 * @property {string} type Type of config option
 * @property {string} name Name ID of config option
 * @property {(string | undefined)} label Displayed label for config option
 */
export type CustomPluginConfigOptions =
  | {
      type: 'group';
      name: string;
      label?: string;
    }
  | {
      type: 'element';
      name: string;
      label?: string;
    }
  | {
      type: 'column';
      name: string;
      label?: string;
      allowedTypes?: ValueType[];
      source: string;
      allowMultiple: boolean;
    }
  | {
      type: 'text';
      name: string;
      label?: string;
      source?: string; // can point to a group or element config
      // if true will omit from prehydrated configs passed through querystring
      secure?: boolean;
      multiline?: boolean;
      placeholder?: string;
      defaultValue?: string;
    }
  | {
      type: 'toggle';
      name: string;
      label?: string;
      source?: string;
      defaultValue?: boolean;
    }
  | {
      type: 'checkbox';
      name: string;
      label?: string;
      source?: string;
      defaultValue?: boolean;
    }
  | {
      type: 'radio';
      name: string;
      label?: string;
      source?: string;
      values: string[];
      singleLine?: boolean;
      defaultValue?: string;
    }
  | {
      type: 'dropdown';
      name: string;
      label?: string;
      source?: string;
      width?: string;
      values: string[];
      defaultValue?: string;
    }
  | {
      type: 'color';
      name: string;
      label?: string;
      source?: string;
    }
  | {
      type: 'variable';
      name: string;
      label?: string;
      allowedTypes?: ControlType[];
    };

/**
 * @typedef {object} PluginInstance
 * @template T Type of Config passed in
 * @property {string} sigmaEnv Permissions within Sigma Environment
 * @property {object} config Set of helper functions for interacting with Plugin Config
 * @property {object} elements Set of helper functions for interacting with Workbook Element Data
 * @property {Function} destroy Destroys Plugin Instance and removes all subscriptions
 */
export interface PluginInstance<T = any> {
  sigmaEnv: 'author' | 'viewer' | 'explorer';

  config: {
    /**
     * Getter for entire Plugin Config
     * @template T Config type to be passed in
     * @returns {Partial<T>} Current Plugin Config
     */
    get(): Partial<T> | undefined;

    /**
     * Performs a shallow merge between current config and passed in config
     * @template T Config type to be passed in
     * @param {Partial<T>} config Config to directly assign
     */
    set(config: Partial<T>): void;

    /**
     * Getter for key within plugin config
     * @template K Possible key within CustomPluginConfigOptions
     * @param {K} key Key within config to retrieve
     * @returns Value within config for passed in key
     */
    getKey<K extends keyof T>(key: K): Pick<T, K>;

    /**
     * Assigns key value pair within plugin
     * @template K Possible key within CustomPluginConfigOptions
     * @template V Value corresponding to K
     * @param {K} key Key within config to set
     * @param {V} value New value to set key to
     */
    setKey<K extends keyof T>(key: K, value: Pick<T, K>): void;

    /**
     * Subscriber for Plugin Config
     * @param {Function} listener Function to be called upon changes to Plugin Config
     */
    subscribe(listener: (arg0: T) => void): Unsubscriber;

    /**
     * Set possible options for plugin config
     * @param {CustomPluginConfigOptions[]} options Possible config options
     */
    configureEditorPanel(options: CustomPluginConfigOptions[]): void;

    /**
     * Gets a static image of a workbook variable
     * @param {string} id ID of the workbook variable in config
     * @returns {WorkbookVariable} Current value of the workbook variable
     */
    getVariable(id: string): WorkbookVariable;

    /**
     * Setter for workbook variable passed in
     * @param {string} id ID of the workbook variable in config
     * @param {unknown[]} values Values to assign to the workbook variable
     */
    setVariable(id: string, ...values: unknown[]): void;

    /**
     * Overrider function for Config Ready state
     * @param {boolean} loadingState Boolean representing if Plugin Config is still loading
     */
    setLoadingState(ready: boolean): void;

    /**
     * Allows users to subscribe to changes in the passed in variable
     * @param {string} id ID of the workbook variable in config
     * @callback callback Function to be called upon receiving an updated workbook variable
     * @returns {Unsubscriber} A callable unsubscriber
     */
    subscribeToWorkbookVariable(
      id: string,
      callback: (input: WorkbookVariable) => void,
    ): Unsubscriber;
  };

  elements: {
    /**
     * Getter for Column Data by parent sheet ID
     * @param {string} id Sheet ID to retrieve columns from
     * @returns {WorkbookElementColumns} Column values contained within corresponding sheet
     */
    getElementColumns(id: string): Promise<WorkbookElementColumns>;

    /**
     * Subscriber to changes in column data by ID
     * @param {string} id Column ID to subscribe to
     * @callback callback Callback function to be called upon changes to column data
     * @returns {Unsubscriber} Callable unsubscriber to column data changes
     */
    subscribeToElementColumns(
      id: string,
      callback: (cols: WorkbookElementColumns) => void,
    ): Unsubscriber;

    /**
     * Subscriber for the data within a given sheet
     * @param {string} id Sheet ID to get element data from
     * @callback callback Function to call on data passed in
     * @returns {Unsubscriber} A callable unsubscriber to changes in the data
     */
    subscribeToElementData(
      id: string,
      callback: (data: WorkbookElementData) => void,
    ): Unsubscriber;
  };

  /**
   * Destroys plugin instance and removes all subscribers
   */
  destroy(): void;
}
