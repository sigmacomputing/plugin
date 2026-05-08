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
  outExtensions: ({ format }) => {
    if (format === 'es') return { js: '.js', dts: '.d.ts' };
    if (format === 'cjs') return { js: '.cjs', dts: '.d.cts' };
    return undefined;
  },
  platform: 'browser',
  sourcemap: true,

  define: {
    __VERSION__: JSON.stringify(packageJson.version),
  },

  publint: true,
  attw: true,
  unused: true,
});
