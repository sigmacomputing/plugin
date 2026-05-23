import { defineConfig } from 'tsdown';

export default defineConfig({
  clean: true,
  failOnWarn: true,
  logLevel: 'warn',

  dts: true,
  entry: ['./src/index.ts'],
  format: {
    esm: {
      outputOptions: {
        dir: './dist/esm',
      },
    },
    cjs: {
      outputOptions: {
        dir: './dist/cjs',
      },
    },
    umd: {
      outputOptions: {
        dir: './dist/umd',
        minify: true,
      },
    },
  },
  platform: 'browser',
  sourcemap: true,
  tsconfig: './tsconfig.app.json',

  define: {
    __VITEST_BROWSER__: false.toString(),
  },

  publint: true,
  attw: true,
  unused: true,
});
