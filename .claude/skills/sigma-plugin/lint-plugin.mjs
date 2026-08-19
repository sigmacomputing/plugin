#!/usr/bin/env node
// Sigma plugin author-time lint (plugin-authoring-reliability plan, P0-2).
//
// Catches the #1 silent-failure trap BEFORE upload: passing a config *key*
// (the `name` from configureEditorPanel) to an SDK call whose arg must be the
// resolved config *value* (e.g. `config.source`, not the literal 'source').
// Also flags undeclared bare imports and `column` configs missing allowedTypes.
//
// Usage: node lint-plugin.mjs <plugin-dir>   (exit 1 if any error-level finding)
// MVP stand-in for a native `sigcli plugins lint` (auto-run inside upload-source).

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const dir = process.argv[2] || '.';
const pkgPath = join(dir, 'package.json');
if (!existsSync(pkgPath)) {
  console.error(`No package.json in ${dir}`);
  process.exit(2);
}
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const deps = new Set(Object.keys(pkg.dependencies || {}));

// SDK calls whose first string arg must be a resolved config VALUE, not the key.
const CONFIG_VALUE_CALLS = [
  'subscribeToElementData', 'useElementData', 'getElementColumns',
  'subscribeToElementColumns', 'usePaginatedElementData', 'fetchMoreElementData',
  'setVariable', 'useVariable', 'subscribeToWorkbookVariable', 'getVariable',
  'triggerAction', 'useActionTrigger', 'registerEffect', 'useActionEffect',
  'useUrlParameter', 'setUrlParameter', 'getUrlParameter', 'subscribeToUrlParameter',
];

function srcFiles(d) {
  const out = [];
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...srcFiles(p));
    else if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(extname(e.name))) out.push(p);
  }
  return out;
}

const files = srcFiles(dir);
const allSrc = files.map((f) => readFileSync(f, 'utf8')).join('\n');

// Config option names declared in configureEditorPanel (the config KEYS).
const configNames = new Set();
for (const m of allSrc.matchAll(/\bname:\s*['"]([A-Za-z0-9_]+)['"]/g)) configNames.add(m[1]);

const errors = [];
const warnings = [];

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    // key-vs-value trap: SDK call with a string-literal arg equal to a config name
    for (const call of CONFIG_VALUE_CALLS) {
      const re = new RegExp(`\\b${call}\\s*\\(\\s*['"]([A-Za-z0-9_]+)['"]`);
      const mm = re.exec(line);
      if (mm && configNames.has(mm[1])) {
        errors.push(`${f}:${i + 1}  ${call}('${mm[1]}') passes the config KEY; pass the resolved value (config['${mm[1]}'] / useConfig('${mm[1]}')).`);
      }
    }
  });
  // undeclared bare imports
  for (const m of src.matchAll(/import\s+[^'"]*from\s+['"]([^'".][^'"]*)['"]/g)) {
    const spec = m[1];
    if (spec.startsWith('.') || spec.startsWith('/')) continue;
    const base = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (!deps.has(base)) warnings.push(`${f}  bare import '${spec}' is not in package.json dependencies (won't be in the import map).`);
  }
}

// column configs missing allowedTypes
for (const m of allSrc.matchAll(/\{[^{}]*type:\s*['"]column['"][^{}]*\}/g)) {
  if (!/allowedTypes/.test(m[0])) {
    const nameM = /name:\s*['"]([^'"]+)['"]/.exec(m[0]);
    warnings.push(`column config '${nameM ? nameM[1] : '?'}' has no allowedTypes (the picker won't filter by type).`);
  }
}

for (const w of [...new Set(warnings)]) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(`\n${errors.length} error(s), ${new Set(warnings).size} warning(s)  [config keys: ${[...configNames].join(', ')}]`);
process.exit(errors.length ? 1 : 0);
