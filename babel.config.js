// @ts-nocheck

const path = require('path');

const { NODE_ENV, BABEL_ENV } = process.env;

const isCommonJs = NODE_ENV === 'test' || BABEL_ENV === 'commonjs';
const isESModule = BABEL_ENV === 'es';
const loose = true;

module.exports = api => {
  api.assertVersion(7);

  const isDevelopment = api.env('development');
  const isProduction = api.env('production');
  const isUnitTest = api.env('test');

  const presets = [
    [
      require.resolve('@babel/preset-env'),
      {
        useBuiltIns: 'entry',
        corejs: 3,
        modules: false, // Do not transform modules to CJS
        targets: { esmodules: true },
        bugfixes: true,
        exclude: [
          'transform-typeof-symbol', // Exclude transforms that make all code slower
          '@babel/plugin-transform-regenerator',
          '@babel/plugin-transform-parameters',
        ],
        loose,
      },
    ],
    [
      require.resolve('@babel/preset-typescript'),
      {
        allowDeclareFields: true,
      },
    ],
  ];

  const babelRuntimePackage = require.resolve('@babel/runtime/package.json');

  const plugins = [
    isCommonJs && ['@babel/transform-modules-commonjs', { loose }],
    isESModule && ['babel-plugin-add-import-extension', { extension: 'mjs' }],

    // Don't include runtime in UMD builds
    BABEL_ENV && [
      require.resolve('@babel/plugin-transform-runtime'),
      {
        corejs: false,
        helpers: true,
        version: babelRuntimePackage.version,
        regenerator: true,
        useESModules: true,
        absoluteRuntime: path.dirname(babelRuntimePackage),
      },
    ],
  ].filter(Boolean);

  const overrides = [
    {
      include: ['./packages/plugin-react'],
      presets: [
        [
          require.resolve('@babel/preset-react'),
          {
            development: isDevelopment || isUnitTest,
            useBuiltIns: true,
          },
        ],
      ],
    },
  ];

  return {
    sourceType: 'unambiguous',
    presets,
    plugins,
    overrides,
  };
};
