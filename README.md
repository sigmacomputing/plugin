<p align="center">
  <a href="https://github.com/sigmacomputing/plugin">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/sigmacomputing/plugin/blob/main/assets/sigma-logo-dark.svg">
      <img alt="Sigma Logo" src="https://github.com/sigmacomputing/plugin/blob/main/assets/sigma-logo-light.svg" width="400px">
    </picture>
  </a>
</p>

# Sigma Computing Plugins

This repository is the monorepo for Sigma Computing's Plugin platform. Sigma
Plugins provide an API for third-party applications to add additional
functionality into an existing Sigma workbook. Plugins are built using Sigma's
Plugin API, which communicates data and interaction events between a Sigma
workbook and the plugin. Plugins are hosted by their developer and rendered in
an iframe in Sigma.

## Packages

| Package | Description |
| --- | --- |
| [`@sigmacomputing/plugin`](./packages/plugin-sdk) | Client SDK for building Sigma plugins. Provides both a standard JavaScript API and a React Hooks API. |

For installation, usage, and API documentation, see the README of each package.

## Contributing

This repo is a [Yarn](https://yarnpkg.com/) workspaces monorepo orchestrated
by [Turborepo](https://turbo.build/). See
[CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and development
workflow.

Common scripts available from the repo root:

```sh
yarn build   # Build all packages
yarn test    # Run all package test suites
yarn lint    # Lint the codebase
yarn types   # Type-check all packages
```

## Changelog

Release notes and breaking changes are documented in
[CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE)
