import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

import packageJson from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(packageJson.version),
    __VITEST_BROWSER__: true.toString(),
  },
  test: {
    globals: true,
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
});
