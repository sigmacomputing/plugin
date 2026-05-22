import { defineConfig, mergeConfig } from 'tsdown';

// @ts-ignore - base config is defined outside of this package
import baseConfig from '../../tsdown.base.ts';

import packageJson from './package.json' with { type: 'json' };

export default mergeConfig(
  baseConfig,
  defineConfig({
    define: {
      __VERSION__: JSON.stringify(packageJson.version),
    },
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
