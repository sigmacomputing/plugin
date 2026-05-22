import { defineConfig, mergeConfig } from 'tsdown';

// @ts-ignore - base config is defined outside of this package
import baseConfig from '../../tsdown.base.ts';

export default mergeConfig(
  baseConfig,
  defineConfig({
    deps: {
      alwaysBundle: [/^dequal(\/|$)/],
    },
    format: {
      umd: {
        outputOptions: {
          entryFileNames: 'sigmacomputing-plugin-sdk-react.umd.js',
          globals: {
            react: 'React',
            '@sigmacomputing/plugin': 'SigmaPlugin',
          },
          name: 'SigmaPluginReact',
        },
      },
    },
  }),
);
