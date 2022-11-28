import path from 'path';

import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import visualizer from 'rollup-plugin-visualizer';
import replace from '@rollup/plugin-replace';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonJS from '@rollup/plugin-commonjs';
import type { OutputOptions, RollupOptions, InputPluginOption } from 'rollup';

import { workspaceMap } from './utils/workspaces';

const { ROLLUP_STATS } = process.env;

interface BuildConfigs {
  name: string;
  packageDir: string;
  umdName: string;
  version: string;
  entryFile: string | string[];
  outputFile: string;
  umdOutputFile: string;
  globals: Record<string, string>;
  bundleUMDGlobals?: string[];
  forceDevEnvironment?: boolean;
  forceBundle?: boolean;
  skipUMDBundle?: boolean;
}

interface BuildOutput {
  input: NonNullable<RollupOptions['input']>;
  external: NonNullable<RollupOptions['external']>;
  umdName: string;
  version: string;
  packageDir: string;
  outputFile: string;
  globals: Record<string, string>;
  forceDevEnvironment?: boolean;
  forceBundle?: boolean;
}

function forceEnvironmentPlugin(type: 'development' | 'production') {
  return replace({
    'process.env.NODE_ENV': `"${type}"`,
    preventAssignment: true,
  });
}

function replaceVersionPlugin(version: string) {
  return replace({
    __VERSION__: `"${version}"`,
    preventAssignment: true,
  });
}

function getDefaultPlugins(version: string): Array<InputPluginOption> {
  return [
    commonJS(),
    babel({
      babelHelpers: 'bundled',
      exclude: /node_modules/,
      extensions: ['.ts', '.tsx'],
    }),
    nodeResolve({ extensions: ['.ts', '.tsx'] }),
    replaceVersionPlugin(version),
  ];
}

function mjs({
  input,
  external,
  version,
  packageDir,
  outputFile,
  forceDevEnvironment,
  forceBundle,
}: BuildOutput): RollupOptions {
  const bundleOutput: OutputOptions = {
    format: 'esm',
    file: `${packageDir}/dist/mjs/${outputFile}.mjs`,
    sourcemap: true,
  };

  const normalOutput: OutputOptions = {
    format: 'esm',
    dir: `${packageDir}/dist/mjs`,
    sourcemap: true,
    preserveModules: true,
    entryFileNames: '[name].mjs',
  };

  const plugins = [...getDefaultPlugins(version)];
  if (forceDevEnvironment) {
    plugins.push(forceEnvironmentPlugin('development'));
  }

  return {
    external,
    input,
    output: forceBundle ? bundleOutput : normalOutput,
    plugins,
  };
}

function esm({
  input,
  external,
  version,
  packageDir,
  outputFile,
  forceDevEnvironment,
  forceBundle,
}: BuildOutput): RollupOptions {
  const bundleOutput: OutputOptions = {
    format: 'esm',
    file: `${packageDir}/dist/esm/${outputFile}.esm.js`,
    sourcemap: true,
  };

  const normalOutput: OutputOptions = {
    format: 'esm',
    dir: `${packageDir}/dist/esm`,
    sourcemap: true,
    preserveModules: true,
    entryFileNames: '[name].esm.js',
  };

  const plugins = [...getDefaultPlugins(version)];
  if (forceDevEnvironment) {
    plugins.push(forceEnvironmentPlugin('development'));
  }

  return {
    external,
    input,
    output: forceBundle ? bundleOutput : normalOutput,
    plugins,
  };
}

function cjs({
  input,
  external,
  version,
  packageDir,
  outputFile,
  forceDevEnvironment,
  forceBundle,
}: BuildOutput): RollupOptions {
  const bundleOutput: OutputOptions = {
    format: 'cjs',
    file: `${packageDir}/dist/cjs/${outputFile}.js`,
    sourcemap: true,
    exports: 'named',
  };

  const normalOutput: OutputOptions = {
    format: 'cjs',
    dir: `${packageDir}/dist/cjs`,
    sourcemap: true,
    exports: 'named',
    preserveModules: true,
    entryFileNames: '[name].js',
  };

  const plugins = [...getDefaultPlugins(version)];
  if (forceDevEnvironment) {
    plugins.push(forceEnvironmentPlugin('development'));
  }

  return {
    external,
    input,
    output: forceBundle ? bundleOutput : normalOutput,
    plugins,
  };
}

function umdDev({
  input,
  external,
  version,
  umdName,
  packageDir,
  outputFile,
  globals,
}: BuildOutput): RollupOptions {
  return {
    external,
    input,
    output: {
      format: 'umd',
      sourcemap: true,
      file: `${packageDir}/dist/umd/${outputFile}.development.js`,
      name: umdName,
      globals,
    },
    plugins: [
      ...getDefaultPlugins(version),
      forceEnvironmentPlugin('development'),
    ],
  };
}

function umdProd({
  input,
  external,
  umdName,
  version,
  packageDir,
  outputFile,
  globals,
}: BuildOutput): RollupOptions {
  const plugins = [
    ...getDefaultPlugins(version),
    forceEnvironmentPlugin('production'),
    terser({
      mangle: true,
      compress: true,
    }),
  ];

  if (ROLLUP_STATS === 'true') {
    plugins.push(
      visualizer({
        filename: `${packageDir}/dist/stats-html.html`,
        gzipSize: true,
      }),
      visualizer({
        filename: `${packageDir}/dist/stats.json`,
        template: 'raw-data',
      }),
    );
  }

  return {
    external,
    input,
    output: {
      format: 'umd',
      sourcemap: true,
      file: `${packageDir}/dist/umd/${outputFile}.production.min.js`,
      name: umdName,
      globals,
    },
    plugins,
  };
}

function buildConfigs({
  packageDir,
  umdName,
  version,
  entryFile,
  outputFile,
  umdOutputFile,
  globals,
  bundleUMDGlobals,
  forceDevEnvironment,
  forceBundle,
  skipUMDBundle,
}: BuildConfigs): RollupOptions[] {
  const firstEntry = path.resolve(
    packageDir,
    Array.isArray(entryFile) ? entryFile[0] : entryFile,
  );

  const entries = Array.isArray(entryFile) ? entryFile : [entryFile];
  const input = entries.map(entry => path.resolve(packageDir, entry));

  const externalDeps = Object.keys(globals);

  const umnGlobals = new Set(bundleUMDGlobals);
  const umdExternal = externalDeps.filter(
    external => !umnGlobals.has(external),
  );

  const external = (moduleName: string) => externalDeps.includes(moduleName);

  const options: BuildOutput = {
    input,
    external,
    umdName,
    version,
    packageDir,
    outputFile,
    globals,
    forceDevEnvironment,
    forceBundle,
  };

  const builds = [mjs(options), esm(options), cjs(options)];

  if (!skipUMDBundle) {
    const umdOptions: BuildOutput = {
      ...options,
      external: umdExternal,
      input: firstEntry,
      outputFile: umdOutputFile,
    };

    builds.push(umdDev(umdOptions), umdProd(umdOptions));
  }

  return builds;
}

function rollup(): RollupOptions[] {
  return [
    ...buildConfigs({
      name: 'plugin',
      packageDir: 'packages/plugin',
      umdName: 'SigmaPlugin',
      entryFile: ['src/index.ts'],
      outputFile: 'index',
      umdOutputFile: 'plugin',
      globals: {},
      version: workspaceMap['plugin'].version,
    }),
    ...buildConfigs({
      name: 'plugin-react',
      packageDir: 'packages/plugin-react',
      umdName: 'SigmaPlugin',
      entryFile: ['src/index.ts'],
      outputFile: 'index',
      umdOutputFile: 'plugin',
      globals: {
        react: 'React',
        '@sigmacomputing/plugin': 'SigmaPlugin',
      },
      bundleUMDGlobals: ['@sigmacomputing/plugin'],
      version: workspaceMap['plugin-react'].version,
    }),
  ];
}

export default rollup;
