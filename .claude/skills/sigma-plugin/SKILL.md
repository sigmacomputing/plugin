---
name: sigma-plugin
description: Scaffold, develop, deploy, AND debug/modify a Sigma Computing custom plugin via the sigcli CLI (`plugins create`/`upload-source`/`pull-source`) — a raw source tree Sigma transforms and serves as native ESM. Use whenever working on a Sigma plugin, not only at creation. Triggers include: "create/scaffold/build/deploy a Sigma plugin" or a plugin idea (chart, control, visualization, element); binding a plugin to data or designing around a data source's columns/schema; adding or wiring plugin data, columns, actions (action-trigger/effect), controls/variables, url params, or theme; and debugging a plugin that "shows no data / wrong or NaN data / a blank iframe / won't build / won't render / errors in the workbook". Covers the `@sigmacomputing/plugin` SDK surface, the element-data contract and 25k-row cap, the config-value-vs-key gotcha, and the three build-failure stages (vite / upload transform / esm.sh).
---

# Sigma Plugin Development (no-bundle)

This skill scaffolds a Sigma custom plugin **source tree** in the current working directory, guides development, and deploys it by uploading the source — **no local build step**. Sigma performs an upload-time TS/JSX→JS transform, generates an import map (dependencies resolve from esm.sh at runtime), and serves the result as native ESM inside the workbook iframe.

The plugin communicates with the workbook through the `@sigmacomputing/plugin` library (see "Fetching API details" below for how to look up its current surface).

## Prerequisites

Before starting, confirm:

1. **sigcli installed and authenticated.** Run `sigcli auth status` — it must report `Auth: OK` against the target Sigma instance. Configure with env vars (`SIGMA_BASE_URL`, `SIGMA_CLIENT_ID`, `SIGMA_CLIENT_SECRET`) or `sigcli auth login`. The **`plugins_v2`** feature flag must be enabled for `/v2/plugins` (create/list/get) and **`plugins_no_bundle`** for `/v2/plugins/:id/source` (upload/pull). If `sigcli` is missing or auth fails, stop and ask the user to install/configure it.
2. **`context7` MCP available (strongly recommended).** Used to look up the current `@sigmacomputing/plugin` API surface. If not connected, warn the user that you'll fall back to reading the published `.d.ts`, and you may refuse to ship code for any API call you can't confirm.
3. **A browser-driving MCP for runtime verification (recommended; required to verify the running plugin).** Building and deploying need no browser. But to *verify the plugin actually renders and shows correct data* — the runtime feedback stage — you drive the workbook in a browser. **`playwright` MCP is the one to use: it is the only channel that captures the plugin's cross-origin iframe `console`** (errors, and the `validateConfigId` / element-data warnings). `chrome-devtools` MCP works for screenshots and DOM snapshots but its `list_console_messages` sees only the main frame, **not** the plugin iframe — so it cannot carry runtime error feedback on its own. If neither is connected, you can still build and deploy, but tell the user you cannot verify runtime behavior and fall back to the DOM-instrumentation pattern (render state + captured `console` into a `data-testid` block) read via screenshot. See "Verifying the Deploy" and the autonomous dev loop below.
4. **No build toolchain required to deploy.** `node`/`npm` are optional — only useful if the user wants to type-check locally. Deployment uploads source; Sigma builds it.

## Decide first: create or update?

**Update path** — the current directory has both `package.json` *and* `.sigma-plugin.json`:
- Do not re-scaffold. Read the existing source before editing; preserve the user's structure.
- Reuse the existing `pluginId`; do **not** run `sigcli plugins create` again.
- Edit → `sigcli plugins upload-source --plugin-id <id> --dir .`.

**Recover path** — the user wants to update but the local source is missing or `.sigma-plugin.json` is gone:
- `sigcli plugins list --format json` → find the plugin by `name` → write `.sigma-plugin.json` with its `pluginId`.
- `sigcli plugins pull-source --plugin-id <id> --out .` to fetch the current source tree, then treat as update.

**Create path** — neither of the above. Proceed to Scaffolding.

## Fetching API details

Do not guess the `@sigmacomputing/plugin` API — hook names, option shapes, and payload types change between versions.

**Before writing any code that uses the library:**
1. **Preferred:** call the `context7` MCP for library `@sigmacomputing/plugin` and consult the returned examples.
2. **Fallback:** read the published types at `node_modules/@sigmacomputing/plugin/dist/index.d.ts` (after an optional `npm install` for local tooling).

If neither source confirms an API shape, stop and tell the user — don't invent one.

## Design around the data source (do this BEFORE writing `configureEditorPanel`)

The single most expensive mistake is designing the plugin for data that doesn't
exist (e.g. assuming Country/Profit columns when the table has lat/long + cost/price).
Discover the schema first, then shape config + aggregation around it.

- **Enumerate the source's columns + types first.** At design time: ask the user for the table, or list its columns via `sigcli connections columns --table-id <id>` / `GET /v2/connections/tables/:id/columns` (also `connections paths`, `datasets`, `data-models`, `files`, `search`). Never assume a schema.
- **Declare `column` options whose `allowedTypes` match the real column types** (`boolean | datetime | number | integer | text | variant | link`). **Mismatch fails silently:** if you declare `allowedTypes: ['number']` but the column is text, the picker just won't offer it — no error.
- **Element-data contract.** `subscribeToElementData(config.<elementKey>, cb)` / `useElementData(config.<elementKey>)` deliver `{ [colId]: any[] }` — **column-oriented parallel arrays**, so row *i* is `data[latColId][i]`, `data[lngColId][i]`, …. A `column` config's *value* is the **column id** you use to index this object.
- **The ~25,000-row cap is real.** `subscribeToElementData`/`useElementData` return at most 25k rows. For more, `usePaginatedElementData` / `fetchMoreElementData` (25k chunks). **Design implication:** point plugins at an appropriately **aggregated** element, not a raw fact table — and surface when the cap truncates so results aren't silently partial.
- **Introspect/adapt at runtime** with `getElementColumns(config.<elementKey>)` / `subscribeToElementColumns` → `{ [colId]: { id, name, columnType } }`.
- **"Data arrived but is wrong" symptoms** (the debug section covers *empty*; these are *wrong shape*):
  - values are `NaN`/blank → a text/`variant` column needs coercion, or the rows have null/empty values (e.g. missing geo).
  - viz empty despite bound columns → hit the 25k cap, or wrong grain (aggregate the source).
  - a column won't appear in the picker → `allowedTypes` mismatch (see above).

## Actions, variables & interactions

**Golden rule (all three families): a `configId` passed to an SDK call is the resolved config VALUE, not the config KEY** — `config.source`, `config.control`, `config.onClick`, never the literal `'source'`/`'control'`/`'onClick'`. Element-data and action calls fail *silently* on the wrong one; variable calls throw. (With the patched SDK this logs a named `console.error`; either way, run the pre-upload lint.)

- **Variables (control plugins) — read/write a workbook control.** Declare `{ name: 'threshold', type: 'variable', allowedTypes: ['number'] }` (`ControlType`: `boolean|date|number|text|text-list|number-list|date-list|number-range|date-range`). Then `const [v, setV] = useVariable(config.threshold)`, or `client.config.setVariable(config.threshold, value)` / `subscribeToWorkbookVariable(config.threshold, cb)`.
- **Actions.** *Trigger* (plugin → workbook): declare `{ name: 'onClick', type: 'action-trigger' }`; `const fire = useActionTrigger(config.onClick)` (or `client.config.triggerAction(config.onClick)`); call `fire()` on a gesture. *Effect* (workbook → plugin): declare `{ name: 'refresh', type: 'action-effect' }`; `useActionEffect(config.refresh, () => {...})` (or `registerEffect`). **Workbook wiring (the one human step):** the user maps the trigger/effect in the element's **Actions** tab (e.g. "when triggered → Set control value").
- **Worked example — click a bar, set a control:** declare `source`/`category`/`measure` columns + a `variable` config `control`; in the bar's `onClick`, `client.config.setVariable(config.control, label)`. Read it back with `subscribeToWorkbookVariable(config.control, …)` to confirm the round-trip. (Verified end-to-end in `plugs-action-demo`.)
- **Adjacent surfaces:** `useUrlParameter(config.<key>)` (url params); `usePluginStyle()` → `{ backgroundColor }` for theme-aware rendering; `setLoadingState(false)` when ready; `sigmaEnv` (`author|viewer|explorer`). **`interaction` / `useInteraction` are deprecated — use Actions.**

## Deploy Workflow

**1. Register the plugin** — run **once** per plugin:

```sh
sigcli plugins create --json '{"name":"<plugin-name>","description":"<desc>","type":"element"}'
```

The response is JSON containing a `pluginId`. **Write `.sigma-plugin.json` immediately** (before anything else) so a retry reuses the same `pluginId` instead of creating a duplicate.

**2. Deploy** — upload the source tree:

```sh
sigcli plugins upload-source --plugin-id <pluginId> --dir .
```

This tars + gzips the project (excluding `node_modules`, `.git`, `.sigma-plugin.json`), uploads it, and returns a `deployId`. Sigma extracts, transforms (TS/JSX→JS), generates the import map, and — once the deploy is verified — flips it live. The plugin's served `url` comes from `sigcli plugins get --plugin-id <id>`.

**3. Modify later** — pull, edit, re-upload:

```sh
sigcli plugins pull-source --plugin-id <pluginId> --out .   # fetch current source
# ...edit files...
sigcli plugins upload-source --plugin-id <pluginId> --dir .  # redeploy
```

### Error recovery

- **`sigcli plugins create` failed** → surface the error verbatim; don't proceed. Common causes: auth (`sigcli auth status`), `/v2/plugins` 404 (check the `plugins_v2` flag), invalid JSON.
- **`create` succeeded but `.sigma-plugin.json` write failed** → print the `pluginId` in chat so the user can save it, then stop.
- **`upload-source` failed** → report verbatim. Do **not** re-run `create`. Common causes: `plugins_no_bundle` flag off, archive over the size cap, a source file with a disallowed extension, or a TS/JSX syntax error reported by the upload-time transform (fix the named file:line and re-upload). Retry is: fix → `upload-source` with the same `pluginId`.

## Scaffolding

When the user asks to start a new plugin, create these files. Do not modify existing files unless asked.

### `package.json`

`dependencies` is load-bearing: Sigma builds the runtime **import map** from it, pinning each dependency to an esm.sh URL. List every runtime dependency with a concrete version. `main` selects the entry module.

```json
{
  "name": "sigma-plugin",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.tsx",
  "dependencies": {
    "@sigmacomputing/plugin": "1.1.1",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "typescript": "^5.6.3"
  }
}
```

### `tsconfig.json`

For local type-checking only (optional). Sigma's transform is syntax-only.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

### `src/index.tsx`

The entry module named by `package.json` `main`. Sigma's generated bootstrap provides `<div id="root">` and the import map, then imports this module. Mount React here; plugin-library init belongs in `App.tsx`.

```tsx
import { createRoot } from 'react-dom/client';

import App from './App';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
```

### `src/App.tsx`

Ships as a blank render. **Before adding workbook data access, editor-panel config, variables, or any other `@sigmacomputing/plugin` call**, fetch current docs via context7 per "Fetching API details".

```tsx
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h2>Plugin ready</h2>
    </div>
  );
}
```

### `.gitignore`

```
node_modules/
.sigma-plugin.json
```

### `.sigma-plugin.json` (created on first deploy, not at scaffold time)

After `sigcli plugins create` returns, write:

```json
{ "pluginId": "<uuid-from-sigcli>" }
```

## Constraints the Source Must Satisfy

The deployed source is transformed and served as native ESM; runtime dependencies load from esm.sh. So:

- **Every runtime import must be a relative path or a declared dependency.** Bare imports (`react`, `@sigmacomputing/plugin`, etc.) resolve only if they're in `package.json` `dependencies` (which becomes the import map). Don't import a package you haven't declared.
- **Use bare specifiers, never hardcoded esm.sh URLs.** Write `import React from 'react'` and add `react` to `dependencies` — Sigma maps the bare specifier to esm.sh in the generated import map. Do **not** write `import … from 'https://esm.sh/react'` directly: it bypasses the `?external=react` de-dup (you get a second React instance and hooks break), skips version pinning, and skips the deploy-time esm.sh preflight.
- **esm.sh-compatible deps only.** Dependencies are fetched from esm.sh at runtime; packages that can't be served as ESM from esm.sh won't load. Prefer lightweight, ESM-friendly libraries.
- **Don't upload `node_modules`.** It's excluded from the archive automatically (deps resolve from esm.sh at runtime); it exists only for optional local type-checking. Uploading it wastes the 20 MB archive cap.
- **Source is public and unminified.** The served tree is world-readable — do not put secrets, tokens, or proprietary logic you can't expose into plugin source.
- **Allowed file types only.** Source trees may contain `.ts/.tsx/.js/.jsx/.mjs/.cjs/.json/.css/.html/.md/.svg` and common image/font assets. Other extensions are rejected at upload.
- **Supported syntax.** Sigma transforms TS/JSX with a syntax-only transformer — standard TypeScript + JSX work; avoid exotic features (e.g. legacy decorators). Type errors are *not* caught at upload; type-check locally if it matters.
- **Use `@sigmacomputing/plugin` for everything Sigma-related.** Don't hand-roll `postMessage` or parse URL params yourself — the library relies on specific shapes.

## When to Stop and Ask

- If the user's idea needs data Sigma doesn't expose (arbitrary HTTP APIs), call that out before generating code.
- If a dependency can't be served from esm.sh, flag it and suggest an alternative.
- If you can't confirm an API shape via context7 or the published `.d.ts`, stop — don't ship guessed hook names.
- If the plugin would embed secrets or proprietary logic, warn that plugin source is public.

## Verifying the Deploy

After `sigcli plugins upload-source` returns a `deployId`, run `sigcli plugins get --plugin-id <id> --format json` and report the populated `url` (the production URL Sigma serves). In a workbook, add the custom plugin element pointing at that plugin to see it render.

## Verify in a workbook via Dev URL mode (preferred local verification)

Deploying (`upload-source`) can be blocked by infra you don't control locally (object-storage bucket, feature gates, DB migrations, flaky staging port-forwards). You do **not** need a successful deploy to see the plugin render in a real Sigma workbook — use **Dev URL mode**, which points the workbook's plugin element at a local dev server over an iframe. This is the fastest, most reliable way to verify the plugin + its Sigma SDK integration end-to-end.

**1. Run the plugin on a local dev server.** Add `vite` + `@vitejs/plugin-react` as devDeps, an `index.html` with `<div id="root">` loading `/src/<main>`, and a `vite.config.ts` pinning a fixed port (`server: { port: 5173, strictPort: true, cors: true }`). Then `npm install && npx vite`. Confirm `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/` returns `200`, and load `http://localhost:5173/` in a browser — the plugin should render standalone (it will show its "configure me" empty state since no Sigma parent is feeding it data/config yet).
   - **Bundling gotcha:** `@sigmacomputing/plugin` must resolve to a version whose npm tarball ships a proper `dist/esm` build. Some published builds (observed: `1.1.0`) ship a **flat, broken `dist/`** whose CJS `require()`s reference sub-modules (`./react/hooks`, `./client/initialize`, …) that aren't in the package, so vite/esbuild fails with `Could not resolve "./react/hooks"`. Pin **`@sigmacomputing/plugin@^1.2.0`** (has `exports` → `dist/esm/index.js`) for local bundling. (This does not affect the no-bundle deploy, which resolves the dep from esm.sh.)

**2. Have the app running.** Local Slate + a Crossover (local or staging) at `http://localhost:3000`, logged into your org.

**3. Add the element and point it at the dev server.** In a workbook (edit mode): bottom toolbar → **UI → Plugin** → pick your registered plugin. It first loads the deployed (production) URL. Then on the element: **⋮ menu → Point to development URL →** enter `http://localhost:5173` → Confirm, then **⋮ menu → Reload plugin**.
   - **Order matters (error-boundary latch):** set the dev URL *first*, then **Reload plugin**. Do **not** do a full page reload to recover — the dev-URL setting is per-session and is **dropped on a full reload**, reverting to the (possibly broken) production URL. If you must reload the page, re-apply Point to development URL afterward.
   - **Undeployed-plugin crash (know this one):** if the plugin has never deployed successfully, its `manifest.url` is `""`. Sigma's `registerPlugin` guards `urlString == null` but not empty string, so `new URL("")` throws `Failed to construct 'URL': Invalid URL`, tripping the element's error boundary *before* the dev URL can take over — so the element shows "We've encountered an error!" even in dev mode. Options: (a) get one successful deploy so `manifest.url` is non-empty; (b) add the element from an already-deployed plugin, then point *its* dev URL at your local server; (c) if you own the Slate checkout, guard empty string in `registerPlugin.ts` (`if (!urlString) return;`) so an empty manifest URL no-ops and dev-URL can drive the iframe.

**4. Confirm the render + the SDK handshake.** A correctly-integrated plugin shows two things: the plugin UI renders inside the element iframe, **and** the element's **Properties panel** (right side) shows the config controls your plugin declared via `client.config.configureEditorPanel([...])` (e.g. a "Source" element picker, column pickers). The config controls appearing is proof the `postMessage` handshake between the iframe (`localhost:5173`) and the workbook (`localhost:3000`) succeeded. Bind a source element + columns there to feed real data.

## Debugging Sigma plugin SDK integration issues

Plugin failures usually surface as a generic Sigma error boundary in the element ("We've encountered an error! Sentry Id: DEV_PLACEHOLDER_SENTRYID") or a blank/never-loading iframe. The message on-screen is not the real error — inspect the layers:

- **Browser console (start here).** Open DevTools console on the workbook tab (or use a driver's `list_console_messages`). The real error is logged above the React error-boundary stack. Common signatures:
  - `Failed to construct 'URL': Invalid URL` → empty/malformed plugin URL (see the undeployed-plugin crash above), thrown from `registerPlugin`.
  - `Could not resolve "./react/hooks"` (in the dev server's terminal, not the browser) → broken `@sigmacomputing/plugin` build; bump to `^1.2.0`.
  - CSP / `frame-ancestors` or sandbox warnings → the iframe is being blocked; check the served CSP.
- **Network tab.** Confirm the iframe actually requested `http://localhost:5173/` (dev mode) or the CDN `url` (prod), that it returned 200, and that the dep URLs in the import map (esm.sh) resolve. A plugin stuck "loading" with no `:5173` request means the dev URL didn't apply (re-do step 3).
- **The SDK handshake.** The plugin ↔ workbook channel is `postMessage`; the library appends `?id=&config=&wbOrigin=&wbPath=` to the iframe URL and exchanges messages. Signs it's working: the editor-panel config controls appear in the Properties panel, and `client.config.subscribe` fires with the bound config.
- **`subscribeToElementData` takes the resolved ELEMENT ID, not the config key (the #1 silent data-starvation bug).** Despite the param being named `configId` and the docs saying "ID from the config", you must pass the config **value** — e.g. `config.source` (an id like `oMNMRCowMW`) — **not** the literal editor-panel key `'source'`. The SDK builds its listen event as `wb:plugin:element:${arg}:data`, and slate (`useElementApi.ts`) posts data on `wb:plugin:element:<elementId>:data` (keyed by `def.config[option.source]`). Pass the key and the event names never match: `config.subscribe` fires normally but element data is forever empty. Canonical pattern: `const data = useElementData(config.source)`, or a manual `subscribeToElementData(config.source, cb)` inside an effect keyed on `[config.source]` (config resolves async, so subscribing at mount with an undefined id also silently no-ops). Confirm delivery by rendering `Object.keys(data).length` into the plugin DOM — `0` means this mismatch (or `!plugin.isVisible`, or the element lacks the `workbook_plugin_element_api` permission, which is in crossover's `DEFAULT_PERMISSIONS` but can be absent on plugins created off the normal path).
- **Golden rule — a `configId` is the resolved config *value*, never the config *key*.** This is the #1 silent-failure class, and it applies to **all three** SDK families, not just element data:
  - element data: `subscribeToElementData(config.source, …)` / `useElementData(useConfig('source'))` — **not** `('source')`
  - variables: `setVariable(config.control, …)` / `useVariable(config.control)` — **not** `('control')`
  - actions: `triggerAction(config.onClick)` / `useActionTrigger(config.onClick)` — **not** `('onClick')`

  Element-data and action calls fail **silently** (empty data / no-op); variable calls throw `"… not found"`. All route through `validateConfigId`, historically a no-op. **Guardrail:** run the pre-upload lint (`node .claude/skills/sigma-plugin/lint-plugin.mjs <dir>`, shipped alongside this skill) — it flags any SDK call whose string-literal arg matches a `configureEditorPanel` name (auto-caught before deploy; MVP for a native `sigcli plugins lint`). It catches direct literals; it can't follow a literal assigned to a variable first, so still self-check indirected calls.
- **"element-data query skipped" console warnings** (from slate's `useElementApi`) name why a plugin got no data: *not visible* (scroll it into view — the visibility gate), *missing `workbook_plugin_element_api` permission*, *no bound source*, or *no bound columns*. If you see one, fix that cause rather than debugging the plugin.
- **Backend (Crossover) logs.** For `create`/`upload-source`/deploy failures (not render), read the Crossover server log for the request's error — e.g. `no-bundle plugin serving is not configured for this environment` (plugin-assets bucket unset), a gRPC `ECONNREFUSED` to encryption/permissions (dropped port-forward), or a missing-table SQL error (branch migration not applied to the DB in use). Match the `requestId`/incident-id from the API response to the log line.
- **Isolate iframe vs integration.** Load the dev URL directly in a browser tab: if it renders there but errors inside Sigma, the problem is the integration layer (URL/handshake/CSP), not your plugin code. If it errors standalone too, it's your plugin/deps.

## When it won't build or load (three distinct stages)

"It doesn't work" splits into three failure stages — identify which before debugging:

1. **Local vite build (dev-URL mode).** The compile error is in the **dev-server terminal**, not the browser. If `curl -s -o /dev/null -w '%{http_code}' http://localhost:<devport>/` isn't `200`, read that log first. Signatures: `Could not resolve "./react/hooks"` → broken `@sigmacomputing/plugin` dist, pin `^1.2.0`; a stale bundle after editing `package.json` `dependencies` → restart vite (`--force`, the import graph / esm.sh pins changed).
2. **Sigma upload-time transform** (`upload-source`). Syntax-only (Sucrase, TSX→JS): a **syntax** error is returned as `file:line` — fix that file and re-`upload-source` (never re-`create`). Also caught here: disallowed file extensions and the archive size cap. **Type errors are NOT caught** (the transform ignores types), so they surface only at runtime — run `tsc --noEmit` locally first. Other 500s: `plugins_no_bundle` flag off, or plugin-assets bucket unset (read the Crossover log, match the incident id).
3. **Runtime esm.sh resolution** (in the browser). A declared dependency that 404s on esm.sh or isn't ESM-serveable fails at **import time**: the plugin never mounts, and the browser **network** tab shows a failed `https://esm.sh/...` request (the import map pins each dep there). Fix: swap the dep for an ESM-friendly one, or pin a known-good version; inspect the generated `importmap.json`.

**Before every deploy, gate locally:** `tsc --noEmit` (catches the type errors the transform won't) **and** the lint (`node .claude/skills/sigma-plugin/lint-plugin.mjs <dir>` — catches the `configId`-as-key trap, undeclared imports, missing `allowedTypes`).

## Autonomous dev loop (iterate with the plugin live in a workbook)

Once the element is in Dev URL mode, **vite HMR pushes every source edit straight into the workbook iframe** — no re-deploy, no re-add, no page reload. That makes a tight, fully-autonomous edit→observe loop possible with a browser driver (the `chrome-devtools` or `playwright` MCP). Set this up so the agent can iterate on the rendered plugin without human clicks.

**One-time setup (do once, then persist):**
1. Start the app (`:3000`) and the plugin dev server (`:5173`), logged into the org.
2. Create a workbook, add the Plugin element, point it at `http://localhost:5173`, **Reload plugin**, and bind a real source + the columns your `configureEditorPanel` declares (so every reload feeds real data). Add a small data element if the page has none — the Source picker needs one.
3. **Save the workbook** (don't leave it a draft), then record the reusable coordinates in `.sigma-plugin.json` so future runs skip all of the above:
   ```json
   { "pluginId": "<uuid>", "devUrl": "http://localhost:5173",
     "devWorkbookUrl": "http://localhost:3000/<org>/workbook/<...>?:nodeId=<elementNodeId>" }
   ```
   Prefer getting one **successful deploy** first (so `manifest.url` is non-empty) — then the element survives full page reloads and the empty-URL crash can't recur; dev-URL just overrides the src.

**The loop (repeat autonomously):**
1. **Assert preconditions:** `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/` is `200`; the dev server log has no compile error.
2. **Edit** `src/*`. vite HMR hot-updates the iframe in place — usually no reload needed.
3. **Observe** with the browser driver, pointed at `devWorkbookUrl`:
   - screenshot the element (by its uid/selector, not just the page) for a tight visual signal;
   - `list_console_messages` (filter `error`,`warn`) — this captures **both** the workbook's `CustomPlugin` error boundary and the plugin iframe's own `console.*`;
   - optionally `list_network_requests` to confirm the `:5173` module graph and esm.sh deps resolve.
4. **Assess & repeat.** If HMR didn't visibly update (e.g. a hooks/edge case), do **⋮ → Reload plugin** (never a full page reload — that drops the dev URL; if it happens, re-apply Point to development URL).

**Getting at plugin-internal state/logs (cross-origin iframe):** the driver's console capture includes the iframe's messages, so plain `console.log`/`console.error` in the plugin are visible to the agent. For structured runtime inspection, either render debug output into the plugin's own DOM (screenshot it) or POST values to a tiny local log collector (see the `slate-debug-logserver` skill's fetch-to-localhost pattern) — useful for confirming what `subscribeToElementData` actually delivered.

**Gotchas that break the loop:** a full page reload drops Dev URL mode (re-apply it); HMR can't recover a hard runtime throw that trips the Sigma error boundary (Reload plugin to remount); and if you change `package.json` `dependencies`, restart vite (the import graph / esm.sh pins changed).
