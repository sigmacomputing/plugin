<p align="center">
  <a href="https://github.com/sigmacomputing/plugin">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/sigmacomputing/plugin/blob/main/assets/sigma-logo-dark.svg">
      <img alt="Sigma Logo" src="https://github.com/sigmacomputing/plugin/blob/main/assets/sigma-logo-light.svg" width="400px">
    </picture>
  </a>
</p>

React bindings for the [`@sigmacomputing/plugin`](https://www.npmjs.com/package/@sigmacomputing/plugin) Client SDK.

This package provides the `SigmaClientProvider` context provider and a set of
React hooks (`usePlugin`, `useConfig`, `useElementColumns`, `useElementData`,
etc.) that wrap the framework-agnostic client exported from
`@sigmacomputing/plugin`.

## Installation

```sh
yarn add @sigmacomputing/plugin @sigmacomputing/plugin-react
# or
npm install @sigmacomputing/plugin @sigmacomputing/plugin-react
```

`react` (`>= 16.8`) is required as a peer dependency.

## Usage

```tsx
import { client } from '@sigmacomputing/plugin';
import { SigmaClientProvider, useConfig } from '@sigmacomputing/plugin-react';

function MyPlugin() {
  const config = useConfig();
  return <pre>{JSON.stringify(config, null, 2)}</pre>;
}

export function App() {
  return (
    <SigmaClientProvider client={client}>
      <MyPlugin />
    </SigmaClientProvider>
  );
}
```

See the [`@sigmacomputing/plugin` README](https://github.com/sigmacomputing/plugin/blob/main/packages/plugin-sdk/README.md)
for the full hook reference.
