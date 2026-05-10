import { defineConfig } from 'tsdown';

import packageJson from './package.json' with { type: 'json' };

export default defineConfig({
  clean: true,
  failOnWarn: true,
  logLevel: 'warn',

  dts: {
    build: true,
  },
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
    umd: {
      outputOptions: {
        dir: 'dist/umd',
        entryFileNames: 'sigmacomputing-plugin.umd.js',
        globals: {
          react: 'React',
        },
        minify: true,
        name: 'SigmaPlugin',
      },
    },
  },
  inputOptions: {
    transform: {
      jsx: 'react',
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
