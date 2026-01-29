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
 * Style colors available to plugins
 * @typedef {object} PluginStyle
 * @property {string} backgroundColor Background color set from workbook if any
 */
export interface PluginStyle {
  backgroundColor: string;
}

/**
 * @typedef {object} WorkbookVariable
 * @property {string} name Name of control variable within workbook
 * @property {{string}} defaultValue Current value containing at least type as string
 */
export interface WorkbookVariable {
  name: string;
  defaultValue: { type: string; value: any };
}

/**
 * @typedef {object} UrlParameter
 * @property {string} value Current url value
 */
export interface UrlParameter {
  value: string;
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

export interface CustomPluginConfigOptionBase {
  name: string;
  label?: string;
}
export interface CustomPluginConfigGroup extends CustomPluginConfigOptionBase {
  type: 'group';
}
export interface CustomPluginConfigElement
  extends CustomPluginConfigOptionBase {
  type: 'element';
}
export interface CustomPluginConfigColumn extends CustomPluginConfigOptionBase {
  type: 'column';
  allowedTypes?: ValueType[];
  source: string;
  allowMultiple: boolean;
}
export interface CustomPluginConfigText extends CustomPluginConfigOptionBase {
  type: 'text';
  source?: string; // can point to a group or element config
  // if true will omit from prehydrated configs passed through querystring
  secure?: boolean;
  multiline?: boolean;
  placeholder?: string;
  defaultValue?: string;
}
export interface CustomPluginConfigToggle extends CustomPluginConfigOptionBase {
  type: 'toggle';
  source?: string;
  defaultValue?: boolean;
}
export interface CustomPluginConfigCheckbox
  extends CustomPluginConfigOptionBase {
  type: 'checkbox';
  source?: string;
  defaultValue?: boolean;
}
export interface CustomPluginConfigRadio extends CustomPluginConfigOptionBase {
  type: 'radio';
  source?: string;
  singleLine?: boolean;
  values: string[];
  defaultValue?: string;
}
export interface CustomPluginConfigDropdown
  extends CustomPluginConfigOptionBase {
  type: 'dropdown';
  source?: string;
  width?: string;
  values: string[];
  defaultValue?: string;
}
export interface CustomPluginConfigColor extends CustomPluginConfigOptionBase {
  type: 'color';
  source?: string;
}
export interface CustomPluginConfigVariable
  extends CustomPluginConfigOptionBase {
  type: 'variable';
  allowedTypes?: ControlType[];
}
export interface CustomPluginConfigInteraction
  extends CustomPluginConfigOptionBase {
  type: 'interaction';
}
export interface CustomPluginConfigActionTrigger
  extends CustomPluginConfigOptionBase {
  type: 'action-trigger';
}
export interface CustomPluginConfigActionEffect
  extends CustomPluginConfigOptionBase {
  type: 'action-effect';
}
export interface CustomPluginConfigUrlParameter
  extends Omit<CustomPluginConfigOptionBase, 'label'> {
  type: 'url-parameter';
}

/**
 * Different types Plugin Config Options
 * @typedef {object} CustomPluginConfigOptions
 * @property {string} type Type of config option
 * @property {string} name Name ID of config option
 * @property {(string | undefined)} label Displayed label for config option
 */
export type CustomPluginConfigOptions =
  | CustomPluginConfigGroup
  | CustomPluginConfigElement
  | CustomPluginConfigColumn
  | CustomPluginConfigText
  | CustomPluginConfigToggle
  | CustomPluginConfigCheckbox
  | CustomPluginConfigRadio
  | CustomPluginConfigDropdown
  | CustomPluginConfigColor
  | CustomPluginConfigVariable
  | CustomPluginConfigInteraction
  | CustomPluginConfigActionTrigger
  | CustomPluginConfigActionEffect
  | CustomPluginConfigUrlParameter;

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
     * @param {string} configId ID from config of type: 'variable'
     * @returns {WorkbookVariable} Current value of the workbook variable
     */
    getVariable(configId: string): WorkbookVariable;

    /**
     * Setter for workbook variable passed in
     * @param {string} configId ID from config of type: 'variable'
     * @param {unknown[]} values Values to assign to the workbook variable
     */
    setVariable(configId: string, ...values: unknown[]): void;

    /**
     * @deprecated Use Action API instead
     * Getter for interaction selection state
     * @param {string} configId ID from config of type: 'interaction'
     */
    getInteraction(configId: string): WorkbookSelection[];

    /**
     * @deprecated Use Action API instead
     * Setter for interaction selection state
     * @param {string} configId ID from config of type: 'interaction'
     * @param {string} elementId Source element ID from element type in Plugin Config
     * @param {Object} selection List of column IDs or Columns and values and key-value pairs to select
     */
    setInteraction(
      configId: string,
      elementId: string,
      selection: WorkbookSelection[],
    ): void;

    /**
     * Triggers an action based on the provided action trigger ID
     * @param {string} configId ID from config of type: 'action-trigger'
     */
    triggerAction(configId: string): void;

    /**
     * Registers an effect with the provided action effect ID
     * @param {string} configId ID from config of type: 'action-effect'
     * @param {Function} effect The effect function to register
     * @returns {Unsubscriber} A callable unsubscriber
     */
    registerEffect(configId: string, effect: () => void): () => void;

    /**
     * Overrider function for Config Ready state
     * @param {boolean} loadingState Boolean representing if Plugin Config is still loading
     */
    setLoadingState(ready: boolean): void;

    /**
     * Allows users to subscribe to changes in the passed in variable
     * @param {string} configId ID from config of type: 'variable'
     * @callback callback Function to be called upon receiving an updated workbook variable
     * @returns {Unsubscriber} A callable unsubscriber
     */
    subscribeToWorkbookVariable(
      configId: string,
      callback: (input: WorkbookVariable) => void,
    ): Unsubscriber;

    /**
     * Allows users to subscribe to changes in the url parameter
     * @param {string} configId ID from config of type: 'url-parameter'
     * @callback callback Function to be called upon receiving an updated url parameter
     * @returns {Unsubscriber} A callable unsubscriber
     */
    subscribeToUrlParameter(
      configId: string,
      callback: (input: UrlParameter) => void,
    ): Unsubscriber;

    /**
     * Gets the current value of a url parameter
     * @param {string} configId ID from config of type: 'url-parameter'
     * @returns {UrlParameter} Current value of the url parameter
     */
    getUrlParameter(configId: string): UrlParameter;

    /**
     * Setter for url parameter
     * @param {string} configId ID from config of type: 'url-parameter'
     * @param {string} value Value to assign to the url parameter
     */
    setUrlParameter(configId: string, value: string): void;

    /**
     * @deprecated Use Action API instead
     * Allows users to subscribe to changes in the passed in interaction ID
     * @param {string} configId ID from the config of type: 'interaction'
     * @callback callback Function to be called upon receiving an updated interaction selection state
     * @returns {Unsubscriber} A callable unsubscriber
     */
    subscribeToWorkbookInteraction(
      configId: string,
      callback: (input: WorkbookSelection[]) => void,
    ): Unsubscriber;
  };

  elements: {
    /**
     * Getter for Column Data by parent sheet ID
     * @param {string} configId ID from config of type: 'element'
     * @returns {WorkbookElementColumns} Column values contained within corresponding sheet
     */
    getElementColumns(configId: string): Promise<WorkbookElementColumns>;

    /**
     * Subscriber to changes in column data by ID
     * @param {string} configId ID from config of type: 'element'
     * @callback callback Callback function to be called upon changes to column data
     * @returns {Unsubscriber} Callable unsubscriber to column data changes
     */
    subscribeToElementColumns(
      configId: string,
      callback: (cols: WorkbookElementColumns) => void,
    ): Unsubscriber;

    /**
     * Subscriber for the data within a given sheet
     * @param {string} configId ID from config of type: 'element'
     * @callback callback Function to call on data passed in
     * @returns {Unsubscriber} A callable unsubscriber to changes in the data
     */
    subscribeToElementData(
      configId: string,
      callback: (data: WorkbookElementData) => void,
    ): Unsubscriber;

    /**
     * Ask sigma to load more data
     * @param {string} configId ID from config of type: 'element'
     */
    fetchMoreElementData(configId: string): void;
  };

  style: {
    /**
     * Subscribe to style updates
     * @param callback Function to call when style updates
     * @returns Unsubscriber function
     */
    subscribe(callback: (style: PluginStyle) => void): () => void;

    /**
     * Request current style from workbook
     * @returns Promise with current style
     */
    get(): Promise<PluginStyle>;
  };

  /**
   * Destroys plugin instance and removes all subscribers
   */
  destroy(): void;
}
