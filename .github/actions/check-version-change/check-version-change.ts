import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import * as core from '@actions/core';
import semver from 'semver';

const readVersion = (json: string, source: string): string => {
  const parsed: unknown = JSON.parse(json);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('version' in parsed) ||
    typeof parsed.version !== 'string'
  ) {
    throw new Error(`${source} is missing a string "version" field`);
  }
  const valid = semver.valid(parsed.version);
  if (valid === null) {
    throw new Error(`${source} has invalid semver version "${parsed.version}"`);
  }
  return valid;
};

try {
  const current = readVersion(
    readFileSync('package.json', 'utf8'),
    'package.json',
  );
  const previous = readVersion(
    execSync('git show HEAD^:package.json', { encoding: 'utf8' }),
    'package.json@HEAD^',
  );
  const changed = !semver.eq(current, previous);

  core.info(
    changed
      ? `Version changed: ${previous} -> ${current}`
      : `Version unchanged (${current}); skipping publish.`,
  );

  core.setOutput('current', current);
  core.setOutput('changed', changed);
} catch (error) {
  core.setFailed(error instanceof Error ? error : 'An unknown error occurred');
}
