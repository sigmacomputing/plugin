import { defineConfig } from 'tsdown';

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
  outExtensions: ({ format }) => {
    if (format === 'es') return { js: '.js', dts: '.d.ts' };
    if (format === 'cjs') return { js: '.cjs', dts: '.d.cts' };
    return undefined;
  },
  platform: 'browser',
  sourcemap: true,
  // target: 'baseline-widely-available',

  publint: true,
  attw: true,
  unused: true,

  define: {
    __VITEST_BROWSER__: false.toString(),
  },
});
