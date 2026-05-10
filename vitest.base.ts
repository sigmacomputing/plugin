import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __VITEST_BROWSER__: true.toString(),
  },
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  optimizeDeps: {
    include: ['react/jsx-dev-runtime'],
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
