# `@sigmacomputing/plugin` is deprecated

> **This package has been renamed to [`@sigmacomputing/plugin-sdk`](https://www.npmjs.com/package/@sigmacomputing/plugin-sdk).**
>
> `@sigmacomputing/plugin` will no longer receive updates. Please migrate your
> projects to `@sigmacomputing/plugin-sdk` to continue receiving new features
> and bug fixes.

This package is now a thin compatibility shim that re-exports everything from
`@sigmacomputing/plugin-sdk`. It emits a `console.warn` at import time to
remind consumers to migrate.

## Migrating

Replace your dependency on `@sigmacomputing/plugin` with `@sigmacomputing/plugin-sdk`:

```sh
yarn remove @sigmacomputing/plugin
yarn add @sigmacomputing/plugin-sdk
```

```sh
npm uninstall @sigmacomputing/plugin
npm install @sigmacomputing/plugin-sdk
```

Then update your imports:

```diff
-import { client, initialize } from '@sigmacomputing/plugin';
+import { client, initialize } from '@sigmacomputing/plugin-sdk';
```

The public API is unchanged — only the package name is different.

For documentation, examples, and the changelog, see the
[`@sigmacomputing/plugin-sdk`](https://github.com/sigmacomputing/plugin) repository.
