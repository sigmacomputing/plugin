import { defineConfig, mergeConfig } from 'vitest/config';

// @ts-ignore - base config is defined outside of this package
import baseConfig from '../../vitest.base.ts';

import packageJson from './package.json' with { type: 'json' };

export default mergeConfig(
  baseConfig,
  defineConfig({
    define: {
      __VERSION__: JSON.stringify(packageJson.version),
    },
  }),
);
