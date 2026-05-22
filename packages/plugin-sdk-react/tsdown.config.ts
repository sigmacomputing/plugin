import { defineConfig } from 'tsdown';

// @ts-ignore - base config is defined outside of this package
import baseConfig from '../../tsdown.base.ts';

// Split into two configs so dequal stays external for ESM/CJS (consumers
// install it via npm) but is bundled into the UMD build, where shipping
// a self-contained file matters more than dedup.

const baseFormat = baseConfig.format as Record<string, any>;

export default [
  defineConfig({
    ...baseConfig,
    format: {
      esm: baseFormat.esm,
      cjs: baseFormat.cjs,
    },
  }),
  defineConfig({
    ...baseConfig,
    deps: { alwaysBundle: [/^dequal(\/|$)/] },
    format: {
      umd: {
        outputOptions: {
          ...baseFormat.umd.outputOptions,
          entryFileNames: 'sigmacomputing-plugin-sdk-react.umd.js',
          globals: {
            ...baseFormat.umd.outputOptions.globals,
            '@sigmacomputing/plugin': 'SigmaPlugin',
          },
          name: 'SigmaPluginReact',
        },
      },
    },
  }),
];
