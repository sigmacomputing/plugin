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
        outputOptions: {
          entryFileNames: 'sigmacomputing-plugin-sdk-react.umd.js',
          globals: {
            react: 'React',
            '@sigmacomputing/plugin': 'SigmaPlugin',
          },
          name: 'SigmaPluginSdkReact',
        },
      },
    },
  }),
);
