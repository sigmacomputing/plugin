import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { select } from '@inquirer/prompts';
import * as semver from 'semver';

type BaseBump = 'patch' | 'minor' | 'major';
type Choice = { label: string; next: string };

const PACKAGE_JSON_PATH = 'package.json';
const PRE_TAG = 'pre';

const PREBUMP: Record<BaseBump, semver.ReleaseType> = {
  patch: 'prepatch',
  minor: 'preminor',
  major: 'premajor',
};

const isPrerelease = (parsed: semver.SemVer): boolean => {
  if (parsed.prerelease.length === 0) return false;
  const [tag, counter, ...rest] = parsed.prerelease;
  if (tag !== PRE_TAG || typeof counter !== 'number' || rest.length > 0) {
    throw new Error(
      `Unsupported prerelease "${parsed.version}"; expected x.y.z-${PRE_TAG}.N`,
    );
  }
  return true;
};

const baseStable = (parsed: semver.SemVer): string =>
  `${parsed.major}.${parsed.minor}.${parsed.patch}`;

const inc = (
  version: string,
  release: semver.ReleaseType,
  identifier?: typeof PRE_TAG,
): string => {
  const result =
    identifier === undefined
      ? semver.inc(version, release)
      : semver.inc(version, release, identifier);
  if (result === null) {
    throw new Error(`semver.inc failed: inc("${version}", "${release}")`);
  }
  return result;
};

const buildChoices = (current: semver.SemVer): Choice[] => {
  const choices: Choice[] = [];

  if (isPrerelease(current)) {
    choices.push({
      label: 'prerelease',
      next: inc(current.version, 'prerelease'),
    });
    choices.push({ label: 'release', next: baseStable(current) });
  }

  const stable = baseStable(current);
  for (const bump of ['patch', 'minor', 'major'] as const) {
    choices.push({ label: bump, next: inc(stable, bump) });
    choices.push({
      label: `${bump} (${PRE_TAG})`,
      next: inc(stable, PREBUMP[bump], PRE_TAG),
    });
  }

  return choices;
};

const promptChoice = async (
  current: string,
  choices: Choice[],
): Promise<Choice> => {
  const labelWidth = Math.max(...choices.map(c => c.label.length));
  return select({
    message: `Select a bump (current: ${current}):`,
    choices: choices.map(c => ({
      name: `${c.label.padEnd(labelWidth)} -> ${c.next}`,
      value: c,
    })),
  });
};

const readCurrentVersion = (): semver.SemVer => {
  const pkg: unknown = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  if (
    typeof pkg !== 'object' ||
    pkg === null ||
    !('version' in pkg) ||
    typeof pkg.version !== 'string'
  ) {
    throw new Error('package.json is missing a string "version" field');
  }
  const parsed = semver.parse(pkg.version);
  if (parsed === null) {
    throw new Error(`Invalid semver version in package.json: "${pkg.version}"`);
  }
  return parsed;
};

const writeNewVersion = (pkgPath: string, version: string): void => {
  const raw = readFileSync(pkgPath, 'utf8');
  const pattern = /("version"\s*:\s*")[^"]+(")/;
  if (!pattern.test(raw)) {
    throw new Error(`Failed to locate "version" field in ${pkgPath}`);
  }
  writeFileSync(pkgPath, raw.replace(pattern, `$1${version}$2`));
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const bumpInternalDeps = (
  pkgPath: string,
  internalPackageNames: readonly string[],
  version: string,
): void => {
  let raw = readFileSync(pkgPath, 'utf8');
  for (const depName of internalPackageNames) {
    const pattern = new RegExp(
      `("${escapeRegex(depName)}"\\s*:\\s*")(?!workspace:)[^"]+(")`,
      'g',
    );
    raw = raw.replace(pattern, `$1^${version}$2`);
  }
  writeFileSync(pkgPath, raw);
};

type TurboQueryLsResponse = {
  packages: {
    items: { name: string; path: string }[];
  };
};

type WorkspacePackage = { name: string; pkgPath: string };

const findWorkspacePackages = (): WorkspacePackage[] => {
  const result = spawnSync(
    'yarn',
    ['turbo', 'query', 'ls', '--output', 'json'],
    { encoding: 'utf8' },
  );

  if (result.status !== 0) {
    throw new Error(
      `turbo query ls failed with exit code ${result.status}: ${result.stderr}`,
    );
  }

  const jsonStart = result.stdout.indexOf('{');
  if (jsonStart === -1) {
    throw new Error(`turbo query ls produced no JSON output: ${result.stdout}`);
  }

  const parsed = JSON.parse(
    result.stdout.slice(jsonStart),
  ) as TurboQueryLsResponse;

  return parsed.packages.items.map(item => ({
    name: item.name,
    pkgPath: path.join(item.path, 'package.json'),
  }));
};

const main = async (): Promise<void> => {
  const current = readCurrentVersion();
  const choices = buildChoices(current);
  const choice = await promptChoice(current.version, choices);

  const workspaces = findWorkspacePackages();
  const internalPackageNames = workspaces.map(w => w.name);
  const targets = [PACKAGE_JSON_PATH, ...workspaces.map(w => w.pkgPath)];

  for (const pkgPath of targets) {
    writeNewVersion(pkgPath, choice.next);
    bumpInternalDeps(pkgPath, internalPackageNames, choice.next);
    console.log(`Bumped ${pkgPath}: ${current.version} -> ${choice.next}`);
  }
};

main().catch((error: unknown) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    process.exit(130);
  }
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
