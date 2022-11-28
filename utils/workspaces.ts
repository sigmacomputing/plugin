import path from 'path';

import fs from 'fs-extra';

export interface Workspace {
  name: string;
  version: string;
  workspace: string;
  path: string;
  hasTests: boolean;
  hasJSX: boolean;
}

export interface PackageJson {
  name: string;
  version: string;
  scripts?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export const ROOT_DIR = path.resolve(__dirname, '..');
export const WORKSPACES_DIR = path.join(ROOT_DIR, 'packages');

export function getWorkspaces(): Workspace[] {
  const rootPackageJsonPath = path.resolve(ROOT_DIR, 'package.json');
  const rootPackageJson: PackageJson = fs.readJSONSync(rootPackageJsonPath);

  const packages = fs.readdirSync(WORKSPACES_DIR, { withFileTypes: true });
  const workspaces: Workspace[] = [];

  for (const dirent of packages) {
    if (dirent.isDirectory()) {
      const packageDir = path.resolve(WORKSPACES_DIR, dirent.name);
      const packageJsonPath = path.resolve(packageDir, 'package.json');
      const packageJson: PackageJson = fs.readJSONSync(packageJsonPath);

      const dependencies = {
        ...packageJson.peerDependencies,
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      workspaces.push({
        name: dirent.name,
        version: packageJson.version || rootPackageJson.version!,
        workspace: packageJson.name,
        path: packageDir,
        hasTests: Boolean(packageJson.scripts?.test),
        hasJSX: Boolean(dependencies.react),
      });
    }
  }

  return workspaces;
}

export const workspaces = getWorkspaces();
export const workspaceMap = workspaces.reduce<Record<string, Workspace>>(
  (acc, workspace) => {
    acc[workspace.name] = workspace;
    return acc;
  },
  {},
);
