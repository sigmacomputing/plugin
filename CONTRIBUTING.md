## Initial setup

Start by forking the `@sigmacomputing/plugin` repo and cloning it locally.

```sh
git clone https://github.com/your-username/sigmacomputing-plugin.git
```

Navigate to the `sigmacomputing-plugin` directory and install the required
dependencies with the following commands:

```sh
# Ensure you correct version of node installed
nvm install
nvm use

yarn install
```

## Start Developing

You can run any of the scripts located in the `package.json` using:

```sh
yarn <script-name>
```

For example, you can run the build process with

```sh
yarn build
# Or in watch mode
yarn build:watch
```

### Add tests

Unit tests ensure that `@sigmacomputing/plugin` doesn't break accidentally. If
your code can regress in non-obvious ways, include unit tests with your PR. Use
the following naming convention:

```
+-- parentFolder
|   +-- __tests__
|       +-- [filename].test.ts
|   +-- [filename].ts
```

Our unit test suite uses [vitest](https://vitest.dev/)

### Run type check

The plugin sdk uses typescript to ensure type safety across the codebase and
catch errors at compile time. Before submitting your contribution, run the
type checker to verify there are no type errors:

```sh
yarn types
```

## Submit a pull request

Before submitting your contribution, run the test suite one last time with:

```sh
yarn test
# Or in watch mode
yarn test:watch
```

Doing this prevents last-minute bugs and is also a great way to get your
contribution merged faster once you submit your pull request. Failing to do so
will lead to one of the maintainers mark the pull request with the Work in
Progress label until all tests pass.

You may need to setup playwright before running tests

```sh
yarn playwright install
```
