## v1.1.0 (January 12th, 2023)

`@sigmacomputing/plugin` has moved to https://github.com/sigmacomputing/plugin and
is now open source. Feel free to create an issue or contribute by opening a pull
request. Read our `CONTRIBUTING.md` guide to get started.

#### Breaking Changes

- `@sigmacomputing/plugin-types` deprecated and has been merged with
  `@sigmacomputing/plugin` and will no longer received updates in the future.
  Please use only `@sigmacomputing/plugin` or `@sigmacomputing/plugin-react`
  (see below) going forward.

- All `react` exports (`SigmaClientProvider` and all hooks) have been moved to
  a separate new package: `@sigmacomputing/plugin-react` export. This will allow
  vanilla plugin users to better bundle split by not importing `react` specific code
  for plugins that do not use `react`.

  ```ts
  // before
  import SigmaClient from '@sigmacomputing/plugin';

  // after
  import { SigmaClientProvider, usePlugin } from '@sigmacomputing/plugin-react';
  ```

  Everything that can be imported from either `@sigmacomputing/plugin` can also
  be imported from `@sigmacomputing/plugin-react`. You do not need to install both plugins.
