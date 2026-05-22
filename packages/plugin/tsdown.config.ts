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
  },
  platform: 'browser',
  sourcemap: true,
  tsconfig: './tsconfig.app.json',

  publint: true,
  attw: true,
  unused: true,
});
