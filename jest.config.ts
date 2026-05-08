import type { Config } from 'jest';

import packageJson from './package.json' with { type: 'json' };

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.test.{js,jsx,ts,tsx}'],
  globals: {
    __VERSION__: JSON.stringify(packageJson.version),
  },
};

export default config;
