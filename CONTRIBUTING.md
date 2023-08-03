## Initial setup

Start by forking the `@sigmacomputing/plugin` repo and cloning it locally.

```shs
git clone https://github.com/your-username/sigmacomputing-plugin.git
```

Navigate to the `sigmacomputing-plugin` directory and install the required
dependencies with the following commands:

```sh
# Ensure you have node version 18 installed (suggestion: v18.16.1).
nvm install
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

Our unit test suite uses [jest](https://jestjs.io/)

## Submit a pull request

Before submitting your contribution, run the test suite one last time with:

```sh
yarn test
```

Doing this prevents last-minute bugs and is also a great way to get your
contribution merged faster once you submit your pull request. Failing to do so
will lead to one of the maintainers mark the pull request with the Work in
Progress label until all tests pass.
