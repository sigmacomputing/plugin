import path from 'path';

import { pathExists } from 'fs-extra';
import type { JestConfigWithTsJest as JestConfig } from 'ts-jest';

import { ROOT_DIR, workspaces, Workspace } from './utils/workspaces';

type JestProjectConfig = Exclude<
  NonNullable<JestConfig['projects']>[number],
  string
>;

interface JestWorkspace extends Workspace {
  jestConfig: JestConfig;
}

async function getJestWorkspaces(): Promise<JestWorkspace[]> {
  const jestWorkspaces: JestWorkspace[] = [];
  for (const workspace of workspaces) {
    const { path: workspacePath, hasTests } = workspace;
    if (hasTests) {
      const jestConfigPath = path.resolve(workspacePath, 'jest.config.ts');
      const jestConfigExists = await pathExists(jestConfigPath);

      if (jestConfigExists) {
        const jestConfig = await import(jestConfigPath);

        jestWorkspaces.push({
          ...workspace,
          jestConfig: jestConfig.default,
        });
      }
    }
  }
  return jestWorkspaces;
}

async function getJestConfig(): Promise<JestConfig> {
  const jestWorkspaces = await getJestWorkspaces();

  const config: JestConfig = {
    projects: jestWorkspaces.map((jestWorkspace): JestProjectConfig => {
      const {
        version,
        workspace: workspaceName,
        path: workspacePath,
        jestConfig,
      } = jestWorkspace;

      const testMatch: JestConfig['testMatch'] = [
        ...(jestConfig.testMatch || []),
        '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
      ];

      const testPathIgnorePatterns: JestConfig['testPathIgnorePatterns'] = [
        path.join(ROOT_DIR, 'node_modules'),
        ...(jestConfig.testPathIgnorePatterns || []),
        path.join(workspacePath, 'node_modules'),
        path.join(workspacePath, 'dist'),
      ];

      const transform: JestConfig['transform'] = {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: path.join(workspacePath, 'tsconfig.json'),
            isolatedModules: true,
          },
        ],
        ...jestConfig.transform,
      };

      return {
        ...jestConfig,

        rootDir: workspacePath,
        roots: [ROOT_DIR, workspacePath],

        displayName: workspaceName,

        globals: {
          __VERSION__: version,
        },

        testMatch,
        testPathIgnorePatterns,

        transform: transform as JestProjectConfig['transform'],
      };
    }),
    watchPlugins: [
      'jest-watch-typeahead/filename',
      'jest-watch-typeahead/testname',
    ],
  };

  return config;
}

export default getJestConfig;
