import { defineConfig, mergeConfig } from 'tsdown';

// @ts-ignore - base config is defined outside of this package
import baseConfig from '../../tsdown.base.ts';

export default mergeConfig(
  baseConfig,
  defineConfig({
    format: {
      umd: {
        deps: {
          alwaysBundle: id => id.startsWith('dequal'),
          // TSDown's types are bad. `skipNodeModulesBundle` defaults to `false`
          // but if you attempt to use the `deps` object,
          // `skipNodeModulesBundle` is a required property so we have to set it
          // or TS will throw a type error.
          skipNodeModulesBundle: false,
        },
      },
    },
  }),
);
