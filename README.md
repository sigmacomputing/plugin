<p align="center">
  <a href="https://github.com/sigmacomputing/plugin">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/sigmacomputing/plugin/blob/main/assets/sigma-logo-dark.svg">
      <img alt="Sigma Logo" src="https://github.com/sigmacomputing/plugin/blob/main/assets/sigma-logo-light.svg" width="400px">
    </picture>
  </a>
</p>

Sigma Computing Plugins provides an API for third-party applications add
additional functionality into an existing Sigma workbook.

Plugins are built using Sigma’s Plugin API. This API communicates data and
interaction events between a Sigma workbook and the plugin. Plugins are hosted
by their developer and rendered in an iframe in Sigma.

#### Warning: Breaking Changes

`@sigmacomputing/plugin` has moved to https://github.com/sigmacomputing/plugin and
is now open source. Please read our
[CHANGELOG.md](https://github.com/sigmacomputing/plugin/blob/main/CHANGELOG.md)
to review any breaking changes that have been made.

## Requirements

To test your plugin in Sigma Plugin Dev Playground, you must:

- Have an Admin, Creator or Explorer account type
- Have Can Edit permission on the work
- Be in the workbook’s Edit mode

To test a development version of a registered plugin, you must:

- Have either:

  - An Admin account type
  - A custom account type that supports plugin developer feature permissions

- Have "can edit" permission on the workbook
- Be in the workbook’s Edit mode

Your plugin must be a Javascript-based project and run in the browser.

## Getting Started

### Installation

Provided you have already followed the steps to create a plugin and a plugin
development environment, you can install `@sigmacomputing/plugin` using one of
the following commands

```sh
yarn add @sigmacomputing/plugin
# or
npm install @sigmacomputing/plugin
```

If you have yet to set up your development environment, follow one of the setup
guides below

### Create a Development Project

At Sigma, we use React for all of our frontend development. This was taken into
consideration when building Sigma’s Plugin feature.

While you are not required to use React for your plugin, it must be written in
Javascript and React is recommended. We support both a standard Javascript API
and a React Hooks API.

#### Create a Project with Vite

1. Open your terminal and navigate to the directory you want to create your
   project in.
2. Create your new project. We recommend using
   [`create-vite`](https://www.npmjs.com/package/create-vite).

   ```sh
   yarn create vite <my-cool-plugin>
   # or
   npm create vite@latest <my-cool-plugin>
   ```

3. Then follow the prompts! You can also directly specify the project name and the template you want to use via additional command line options. For example, to scaffold a Vite + Vue project, run:

   ```sh
   yarn create vite my-vue-app --template vue
   ```

4. Navigate to the project's main directory.

   ```sh
   cd <my-cool-plugin>
   ```

5. Use your package manager to install Sigma’s plugin library. We recommend
   using `yarn`.

   ```sh
   yarn add @sigmacomputing/plugin
   ```

6. Spin up your local development server.

   ```sh
   yarn && yarn dev
   ```

7. Start developing:

   - Get started with Sigma’s Plugin APIs.
   - Test your plugin directly in a Sigma workbook using the Sigma Plugin Dev
     Playground.
   - By default, vite dev servers run on http://localhost:5173.

NOTE: Facebook's [create-react-app](https://github.com/facebook/create-react-app) is deprecated. You should use [vite](https://github.com/vitejs/vite) to setup your project.

## Testing your Plugin

Plugin developers should have access to a special plugin called Sigma Plugin Dev
Playground. This plugin is available from any workbook and points to
http://localhost:3000, by default.

If you cannot find this plugin, or would like a development playground with an
alternative default host, please contact your Organization Admin with a request
to Register a Plugin with its production URL set to your preferred development
URL.

### Using the Development Playground

Before you start:

- Set your plugin’s development URL to http://localhost:3000.
- Start your plugin locally

  > Note: If you followed our recommendations under
  > [#create-a-development-project](#create-a-development-project), enter the
  > following command in your terminal:
  >
  > ```sh
  > yarn && yarn start
  > ```

1. Create/open a workbook.
2. In the workbook header, click Edit.
3. Click the + button in the sidebar, to open the workbook’s ADD NEW panel.
4. Select the PLUGINS element type, located under UI ELEMENTS.
5. The editor panel will show you a list of available plugins. Select Sigma
   Plugin Dev Playground.
6. Your new plugin element will appear on the page.

> **Note:**
> The editor panel will only display content if you have configured your plugin
> using Sigma’s plugin [Configuration API](#documentation).
> Likewise, the element will only display content if your plugin is configured to display content.
> If you change a plugin's configuration options, input values will need to be
> re-added in the editor panel.

**Now what?**

- You can refresh your plugin as you make changes to its code. This option is
  available from the element’s menu.
- You are responsible for hosting your plugin. [Learn more](#host-your-plugin).
- When you’re ready to register your plugin, [Add your custom your
  Plugin](https://help.sigmacomputing.com/hc/en-us/articles/4410105794963) with
  Sigma.

## Documentation

#### CustomPluginConfigOptions

A plugin can be configured with any number of configuration fields. Each field
type has its own configuration options. Each field type is also guaranteed to
have the following options:

- `name : string` - the name of the field
- `type : string` - the field type
- `label : string (optional)` - a display name for the field

<details>
<summary>Full CustomPluginConfigOptions Type</summary>

```ts
type CustomPluginConfigOptions =
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
      secure?: boolean; // if true will omit from prehydrated configs
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
    }
  | {
      type: 'interaction';
      name: string;
      label?: string;
    }
  | {
      type: 'action-trigger';
      name: string;
      label?: string;
    }
  | {
      type: 'action-effect';
      name: string;
      label?: string;
    };
```

</details>

**Group**

Can be used to identify a group of related fields

**Element**

A custom element that is added by your plugin

**Column**

A custom column configuration that your plugin uses

Additional Fields

- `allowedTypes : ValueType[] (optional)` - the allowed data types that this
  column can contain where `ValueType` has the following type:

  ```ts
  type ValueType =
    | 'boolean'
    | 'datetime'
    | 'number'
    | 'integer'
    | 'text'
    | 'variant'
    | 'link'
    | 'error';
  ```

- `source : string` - the data source that should be used to supply this field
- `allowMultiple : boolean` - whether multiple columns should be allowed as
  input for this field

**Text**

A configurable text input for your plugin

Additional Fields

- `source : string (optional)` - the data source that should be used to supply this field
- `secure : boolean (optional)` - whether to omit input from pre-hydrated configs
- `multiline : boolean (optional)` - whether this text input should allow
  multiple lines
- `placeholder : string (optional)` - the placeholder for this input field
- `defaultValue : string (optional)` - the default value for this input field

**Toggle**

A configurable toggle for your plugin

Additional Fields

- `source : string (optional)` - the data source that should be used to supply this field
- `defaultValue : boolean (optional)` - the default value for this input field

**Checkbox**

A configurable checkbox for your plugin

Additional Fields

- `source : string (optional)` - the data source that should be used to supply this field
- `defaultValue : boolean (optional)` - the default value for this input field

**Radio**

A configurable radio button for your plugin

Additional Fields

- `source : string (optional)` - the data source that should be used to supply
  this field
- `values : string[]` - the options to show for this input field
- `singleLine : boolean (optional)` - whether to display options on a single
  line. Good for (2-3) options
- `defaultValue : boolean (optional)` - the default value for this input field

**Dropdown**

A configurable dropdown for your plugin

Additional Fields

- `source : string (optional)` - the data source that should be used to supply
  this field
- `values : string[]` - the options to show for this input field
- `width : string (optional)` - how wide the dropdown should be in pixels
- `defaultValue : boolean (optional)` - the default value for this input field

**Color**

A configurable color picker for your plugin

Additional Fields

- `source : string (optional)` - the data source that should be used to supply
  this field

**Variable**

A configurable workbook variable to control other elements within your workbook

Additional Fields

- `allowedTypes : ControlType[] (optional)` - the allowed control types that this
  variable can use where `ControlType` has the following type:

  ```ts
  type ControlType =
    | 'boolean'
    | 'date'
    | 'number'
    | 'text'
    | 'text-list'
    | 'number-list'
    | 'date-list'
    | 'number-range'
    | 'date-range';
  ```

**Interaction**

A configurable workbook interaction to interact with other charts within your workbook

**Action Trigger**

A configurable action trigger to trigger actions in other elements within your workbook

**Action Effect**

A configurable action effect that can be triggered by other elements within your workbook

#### PluginInstance

```ts
interface PluginInstance<T> {
  sigmaEnv: 'author' | 'viewer' | 'explorer';

  config: {
    /**
     * Getter for entire Plugin Config
     */
    get(): Partial<T> | undefined;

    /**
     * Performs a shallow merge between current config and passed in config
     */
    set(config: Partial<T>): void;

    /**
     * Getter for key within plugin config
     */
    getKey<K extends keyof T>(key: K): Pick<T, K>;

    /**
     * Assigns key value pair within plugin
     */
    setKey<K extends keyof T>(key: K, value: Pick<T, K>): void;

    /**
     * Subscriber for Plugin Config
     */
    subscribe(listener: (arg0: T) => void): Unsubscriber;

    /**
     * Set possible options for plugin config
     */
    configureEditorPanel(options: CustomPluginConfigOptions[]): void;

    /**
     * Gets a static image of a workbook variable
     */
    getVariable(configId: string): WorkbookVariable;

    /**
     * Setter for workbook variable passed in
     */
    setVariable(configId: string, ...values: unknown[]): void;

    /**
     * Getter for interaction selection state
     */
    getInteraction(configId: string): WorkbookSelection[];

    /**
     * Setter for interaction selection state
     */
    setInteraction(
      configId: string,
      elementId: string,
      selection: WorkbookSelection[],
    ): void;

    /**
     * Triggers an action based on the provided action trigger ID
     */
    triggerAction(configId: string): void;

    /**
     * Registers an effect with the provided action effect ID
     */
    registerEffect(configId: string, effect: Function): void;

    /**
     * Overrider function for Config Ready state
     */
    setLoadingState(ready: boolean): void;

    /**
     * Allows users to subscribe to changes in the passed in variable
     */
    subscribeToWorkbookVariable(
      configId: string,
      callback: (input: WorkbookVariable) => void,
    ): Unsubscriber;

    /**
     * @deprecated Use Action API instead
     * Allows users to subscribe to changes in the passed in interaction ID
     */
    subscribeToWorkbookInteraction(
      configId: string,
      callback: (input: WorkbookSelection[]) => void,
    ): Unsubscriber;
  };

  elements: {
    /**
     * Getter for Column Data by parent sheet ID
     */
    getElementColumns(configId: string): Promise<WbElementColumns>;

    /**
     * Subscriber to changes in column data by ID
     */
    subscribeToElementColumns(
      configId: string,
      callback: (cols: WbElementColumns) => void,
    ): Unsubscriber;

    /**
     * Subscriber for the data within a given sheet
     */
    subscribeToElementData(
      configId: string,
      callback: (data: WbElementData) => void,
    ): Unsubscriber;
  };

  /**
   * Destroys plugin instance and removes all subscribers
   */
  destroy(): void;
}
```

### Framework Agnostic API

#### client

The client is a pre-initialized plugin instance. You can use this instance
directly or create your own instance using `initialize`

```ts
const client: PluginInstance = initialize();
```

Usage

```ts
import { client } from '@sigmacomputing/plugin';

client.config.configureEditorPanel([
  { name: 'source', type: 'element' },
  { name: 'dimension', type: 'column', source: 'source', allowMultiple: true },
]);
```

#### initialize()

Instead of using the pre-initialized plugin instance, you can create your own
plugin instance.

```ts
function initialize<T = {}>(): PluginInstance<T>;
```

Usage

```ts
import { initialize } from '@sigmacomputing/plugin';

const myClient: PluginInstance = initialize();

myClient.config.configureEditorPanel([
  { name: 'source', type: 'element' },
  { name: 'dimension', type: 'column', source: 'source', allowMultiple: true },
]);
```

### React API

#### <SigmaClientProvider />

A context provider your plugin that enables all of the other React API hooks.
You should wrap your plugin with this provider if your want to use the plugin
hook API.

```ts
interface SigmaClientProviderProps {
  client: PluginInstance;
  children?: ReactNode;
}

function SigmaClientProvider(props: SigmaClientProviderProps): ReactNode;
```

#### usePlugin()

Gets the entire plugin instance

```ts
function usePlugin(): PluginInstance;
```

#### useEditorPanelConfig()

Provides a setter for the plugin's configuration options

```ts
function useEditorPanelConfig(nextOptions: CustomPluginConfigOptions[]): void;
```

Provides a setter for the Plugin's Config Options

Arguments

- `nextOptions : CustomPluginConfigOptions[]` - Updated possible Config Options

#### useLoadingState()

Gets the current plugin's loading stat. Returns a value and a setter allowing
you to update the plugin's loading state

```ts
function useLoadingState(
  initialState: boolean,
): [boolean, (nextState: boolean) => void];
```

Arguments

- `initialState : boolean` - Initial value to set loading state to

#### useElementColumns()

Provides the latest column values from corresponding sheet

```ts
function useElementColumns(elementId: string): WorkbookElementColumns;
```

Arguments

- `elementId : string` - A workbook element’s unique identifier.

Returns the column information from the specified element.

```ts
interface WorkbookElementColumn {
  id: string;
  name: string;
  columnType: ValueType;
}

interface WorkbookElementColumns {
  [colId: string]: WbElementColumn;
}
```

#### useElementData()

Provides the latest data values from corresponding sheet, up to 25000 values.

```ts
function useElementData(configId: string): WorkbookElementData;
```

Arguments

- `configId : string` - A workbook element’s unique identifier from the plugin config.

Returns the row data from the specified element.

```ts
interface WorkbookElementData {
  [colId: string]: any[];
}
```

#### usePaginatedElementData()

Provides the latest data values from the corresponding sheet (initially 25000), and provides a
callback for fetching more data in chunks of 25000 values.

```ts
function useElementData(configId: string): [WorkbookElementData, () => void];
```

Arguments

- `configId : string` - A workbook element’s unique identifier from the plugin config.

Returns the row data from the specified element, and a callback for fetching
more data.

```ts
interface WorkbookElementData {
  [colId: string]: any[];
}
```

#### useVariable()

Returns a given variable's value and a setter to update that variable

```ts
function useVariable(
  configId: string,
): [WorkbookVariable | undefined, (...values: unknown[]) => void];
```

Arguments

- `configId : string` - The config ID corresponding to the workbook control variable

The returned setter function accepts 1 or more variable values expressed as an
array or multiple parameters

```ts
function setVariableCallback(...values: unknown[]): void;
```

#### useInteraction()

Returns a given interaction's selection state and a setter to update that interaction

```ts
function useInteraction(
  configId: string,
  elementId: string,
): [WorkbookSelection | undefined, (value: WorkbookSelection[]) => void];
```

Arguments

- `configId : string` - The config ID corresponding to the workbook interaction
- `elementId : string` - The ID of the element that this interaction is
  associated with

The returned setter function accepts an array of workbook selection elements

```ts
function setVariableCallback(value: WorkbookSelection[]): void;
```

#### useActionTrigger()

- `configId : string` - The config ID corresponding to the action trigger

Returns a callback function to trigger one or more action effects for a given action trigger

```ts
function useActionTrigger(configId: string): () => void;
```

#### triggerActionCallback();

Arguments

- `configId : string` - The config ID corresponding to the action trigger

The function that can be called to asynchronously trigger the action

```ts
function triggerActionCallback(configId: string): void;
```

#### useActionEffect()

Registers and unregisters an action effect within the plugin

```ts
function useActionEffect(configId: string, effect: () => void);
```

Arguments

- `configId : string` - The config ID corresponding to the action effect
- `effect : Function` - The function to be called when the effect is triggered

#### useConfig()

Returns the workbook element’s current configuration. If a key is provided, only
the associated configuration is returned.

```ts
function useConfig(key?: string): any;
```

Arguments

- `key : string (optional)` - The name of a key within the associated
  `PluginConfigOptions` object

## Examples

Sigma’s development team has created a set of example plugins, listed below.

All of our example plugins are hosted and can be added to your organization. To
view / add an example plugin to your organization, follow the steps to register
a plugin using its Production URL, listed below.

You can also visit Sigma’s [Sample Plugin
repository](https://github.com/sigmacomputing/sigma-sample-plugins) directly on
Github.

### Available Plugins

- **Recharts Bar Chart** - A basic bar chart built with the Recharts library.

  - [Source Code](https://github.com/sigmacomputing/sigma-sample-plugins/tree/main/sample-plugin-bar-chart)
  - Production URL: https://sigma-sample-bar-chart-54049.netlify.app/

- **D3 Candlestick** - A candlestick visualization built with D3.

  - [Source Code](https://github.com/sigmacomputing/sigma-sample-plugins/tree/main/sample-plugin-bar-chart)
  - Production URL: https://sigma-sample-candlestick-chart-1664e5.netlify.app/

- **Narrative Science Quill** - Demonstrates secure text entry.

  - [Source Code]()
  - Production URL: https://narrativescience-quill-3ee312.netlify.app/

- **D3 Graph** - Demonstrates usage of multiple data sources and in-memory
  joins.

  - [Source Code](https://github.com/sigmacomputing/sigma-sample-plugins/tree/main/d3-graph)
  - Production URL: https://d3-graph-3a0d0f.netlify.app/

- **D3 Sunburst** - A sunburst visualization built with D3.

  - [Source Code](https://github.com/sigmacomputing/sigma-sample-plugins/tree/main/d3-sunburst)
  - Production URL: https://d3-sunburst-b97c7c.netlify.app/

- **Frappe Heatmap** - A basic Frappe visualization example.

  - [Source Code](https://github.com/sigmacomputing/sigma-sample-plugins/tree/main/frappe-heatmap)
  - Production URL: https://frappe-heatmap-9a4163.netlify.app/

### Use an Example in Your Organization

To add an example plugin to your organization, follow the steps to [register a
plugin](https://help.sigmacomputing.com/hc/en-us/articles/4410105794963) using
its Production URL, listed in the [examples](#available-plugins) above.

### Run an Example Locally

1. Open your terminal, and navigate to the directory you want to save the example’s in.
2. Clone Sigma’s [Sample Plugin
   repository](https://github.com/sigmacomputing/sigma-sample-plugins).

   ```sh
   git clone https://github.com/sigmacomputing/sigma-sample-plugins.git
   ```

3. Navigate to the plugin you would like to try.

   ```sh
   cd sigma-sample-plugins/<plugin-name>
   ```

4. Run the plugin.

   ```sh
   yarn && yarn start
   ```

> **Note**: For additional instructions, visit the README file located in the main directory of any given example plugin.

## Host Your Plugin

As a plugin developer, you are responsible for hosting your plugin(s). If you’re
new to hosting your own projects, here are a few popular hosting platforms you
can get started with:

- [Heroku](https://devcenter.heroku.com/)
- [Netlify](https://www.netlify.com/)

## Contributing

We welcome contributions to `@sigmacomputing/plugin`!

🐛 Issues, 📥 Pull requests and 🌟 Stars are always welcome.
Read our [contributing
guide](https://github.com/sigmacomputing/plugin/blob/main/CONTRIBUTING.md) to
get started.

**yarn format**

Format your code to match the sigmacomputing style guide

**yarn test**

Check if the unit tests all pass

> You can also run the tests in `--watch` mode with **yarn test:watch**
