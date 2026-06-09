## Unreleased

#### Features

- Added a message debugger to the client SDK. Call `client.debug.enable()` (or
  load the plugin with `?debug=true`) to log every message exchanged with the
  host workbook, or `client.debug.subscribe(...)` to handle messages yourself.

## v1.0.0 (September 23rd, 2022)

`@sigmacomputing/plugin` has moved to https://github.com/sigmacomputing/plugin and
is now open source. Feel free to create an issue or contribute by opening a pull
request. Read our `CONTRIBUTING.md` guide to get started.

#### Breaking Changes

- `@sigmacomputing/plugin-types` has been merged with `@sigmacomputing/plugin`
  and will no longer received updates in the future. Please use only
  `@sigmacomputing/plugin` going forward.
