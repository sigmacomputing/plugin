import type { Config } from 'jest';

const config: Config = {
  modulePaths: ['<rootDir>/src'],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
};

export default config;
