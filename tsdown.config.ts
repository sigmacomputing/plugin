import { defineConfig } from 'tsdown';

import packageJson from './package.json' with { type: 'json' };

export default defineConfig({
  clean: true,
  failOnWarn: true,
  logLevel: 'warn',

  dts: true,
  entry: ['src/index.ts'],
  format: {
    esm: {
      outputOptions: {
        dir: 'dist/esm',
      },
    },
    cjs: {
      outputOptions: {
        dir: 'dist/cjs',
      },
    },
  },
  platform: 'browser',
  sourcemap: true,

  define: {
    __VERSION__: JSON.stringify(packageJson.version),
    __VITEST_BROWSER__: false.toString(),
  },

  publint: true,
  attw: true,
  unused: true,
});
