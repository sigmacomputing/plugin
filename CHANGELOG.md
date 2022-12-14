## v1.0.0 (September 23rd, 2022)

`@sigmacomputing/plugin` has moved to https://github.com/sigmacomputing/plugin and
is now open source. Feel free to create an issue or contribute by opening a pull
request. Read our `CONTRIBUTING.md` guide to get started.

#### Breaking Changes

- `@sigmacomputing/plugin-types` has been merged with `@sigmacomputing/plugin`
  and will no longer received updates in the future. Please use only
  `@sigmacomputing/plugin` going forward.

- All `react` exports (`SigmaClientProvider` and all hooks) have been moved to
  a separate explicit export. This will allow better bundle splitting by not
  including `react` specific code for plugins that do not use `react`.

  ```ts
  // before
  import { SigmaClientProvider, usePlugin } from '@sigmacomputing/plugin';

  // after
  import { SigmaClientProvider, usePlugin } from '@sigmacomputing/plugin/react';
  ```

  All types can be imported from either `@sigmacomputing/plugin` or `@sigmacomputing/plugin/react`
