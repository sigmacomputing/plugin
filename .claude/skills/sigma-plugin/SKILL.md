---
name: sigma-plugin
description: Scaffold, develop, and deploy a Sigma Computing custom plugin from scratch using the sigcli CLI's `plugins create` and `plugins upload-bundle` commands. Use when the user says "create a new Sigma plugin", "scaffold a Sigma plugin", "build a plugin for Sigma", "deploy this plugin to Sigma", or describes a plugin idea (chart, control, visualization, element) to build for a Sigma workbook. Produces a single-file HTML bundle via Vite + vite-plugin-singlefile and pushes it through sigcli.
---

# Sigma Plugin Development

This skill scaffolds a Sigma custom plugin project in the current working directory, guides development locally, and deploys the built bundle to the user's Sigma organization via the `/v2/plugins` REST API (gated on the `plugins_v2` feature flag).

The plugin is a self-contained HTML page rendered inside a Sigma workbook iframe. It communicates with the workbook through the `@sigmacomputing/plugin` library (see "Fetching API details" below for how to look up its current surface).

## Prerequisites

Before starting, confirm:

1. **`sigcli` installed and authenticated.** Run `sigcli profile list` — it should print the user's active profile without errors. If the binary is missing or no profile is configured, stop and walk the user through `sigcli profile add` (or point them at the `sigcli-setup` skill). The `plugins_v2` feature flag must also be enabled on the org — if `sigcli plugins list` returns a 404 or "feature not enabled" error, ask the user to have an admin enable it.
2. **`context7` MCP available (strongly recommended).** Used to look up the current `@sigmacomputing/plugin` API surface. If not connected, warn the user that you'll fall back to reading the installed `.d.ts` (see "Fetching API details") — slower and less complete, and you may refuse to ship code for any API call you can't confirm.
3. `node` and `npm` (or `pnpm`/`yarn`) installed.
4. The user is in an empty or dedicated directory. If they're inside a larger repo, confirm they want the plugin scaffolded there before creating files.

## Decide first: create or update?

**Update path** — the current directory has both `package.json` *and* `.sigma-plugin.json`:
- Do not re-scaffold any files.
- Read the existing source before editing. Preserve structure the user has built.
- Reuse the existing `pluginId`; do **not** call `sigcli plugins create` again.
- Edit → `npm run build` → `sigcli plugins upload-bundle` with the existing `pluginId`.

**Recover path** — the user wants to update a plugin but `.sigma-plugin.json` is missing:
- Run `sigcli plugins list`, find the plugin by name, write `.sigma-plugin.json` with its `pluginId`, then treat as update.

**Create path** — neither of the above. Proceed to Scaffolding.

## Fetching API details

Do not guess the `@sigmacomputing/plugin` API — hook names, option shapes, and payload types change between versions.

**Before writing any code that uses the library**, fetch current docs:

1. **Preferred:** call the `context7` MCP for library `@sigmacomputing/plugin` and consult the returned examples.
2. **Fallback:** after `npm install`, read the installed types at `node_modules/@sigmacomputing/plugin/dist/index.d.ts`. Grep for the exact method name you intend to call.

If neither source confirms an API shape, stop and tell the user — don't invent one.

## Deploy Workflow

**1. Register the plugin** — run `sigcli plugins create` **once** per plugin:

```bash
sigcli plugins create --json '{"name": "<user-supplied name>"}'
```

The response is JSON containing `pluginId` (UUID), `devUrl` (`http://localhost:5173` by default), `url` (empty until first bundle upload), and the rest of the manifest. Parse `pluginId` out of the response — you'll need it for every subsequent call.

> **Write `.sigma-plugin.json` immediately** after `sigcli plugins create` returns, before `npm install`, before build, before anything else. If any later step fails, retry reuses the same `pluginId` instead of creating a duplicate plugin in the org.

**2. Develop locally** — run `npm run dev`. Dev server starts on `http://localhost:5173`. In Sigma, enable dev mode on the plugin element so the iframe loads from `localhost:5173` instead of the production URL.

**3. Deploy** — `npm run build`, then upload the bundle:

```bash
sigcli plugins upload-bundle --plugin-id <pluginId> --file dist/index.html
```

The response JSON includes the new production `url`. Report it to the user. Bundles must be ≤ 10 MB (the API rejects larger uploads).

### Error recovery

- **`sigcli plugins create` failed** → surface the stderr/exit-code verbatim. Don't proceed.
- **`sigcli plugins create` succeeded but write of `.sigma-plugin.json` failed** → surface the `pluginId` from the response in chat so the user can save it manually, then stop.
- **`sigcli plugins upload-bundle` failed** → report the error verbatim. Do **not** re-call `sigcli plugins create`. Retry is: fix the cause → rebuild → `sigcli plugins upload-bundle` again with the same `pluginId`.
- **Bundle exceeds 10 MB** → don't retry the upload. Trim dependencies (see "Constraints the Bundle Must Satisfy") and rebuild.

## Scaffolding

When the user asks to start a new plugin, create these files. Do not modify existing files in the directory unless the user explicitly asks.

### `package.json`

```json
{
  "name": "sigma-plugin",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@sigmacomputing/plugin": "^1.1.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vite-plugin-singlefile": "^2.0.3"
  }
}
```

### `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'esnext',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
  server: { port: 5173 },
});
```

### `tsconfig.json`

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
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

### `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sigma Plugin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### `src/main.tsx`

Deliberately minimal — wire React, nothing else. Plugin-library init (editor panel, etc.) belongs in `App.tsx` where you've already looked up the current API via context7.

```tsx
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

### `src/App.tsx`

Ships as a blank render. **Before adding workbook data access, editor panel config, variables, or any other `@sigmacomputing/plugin` call**, fetch current docs via context7 per the "Fetching API details" section above.

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
dist/
.sigma-plugin.json
```

### `.sigma-plugin.json` (created on first deploy, not at scaffold time)

After `sigcli plugins create` returns, write:

```json
{
  "pluginId": "<uuid-from-create-response>",
  "devUrl": "http://localhost:5173"
}
```

## Constraints the Bundle Must Satisfy

These constraints exist because the deployed plugin is served as a **single HTML file from a CDN** — no server, no code splitting, no network fetches for assets.

- **Single file output.** The build must produce exactly one file at `dist/index.html`. `vite-plugin-singlefile` enforces this. Do not introduce dynamic imports or split chunks that would break single-file output.
- **Bundle ≤ 10 MB.** The `/v2/plugins/{id}/bundle` endpoint rejects larger uploads. Most plugins land well under this; if you're approaching it, trim deps before rebuilding.
- **No external asset references.** No CDN links (`<script src="https://...">`, `<link href="https://fonts...">`), no external CSS, no external fonts. Inline everything or bundle it locally.
- **No network calls for app data.** The plugin receives data from Sigma through the `@sigmacomputing/plugin` API, not from external APIs. (Third-party services like map tiles are OK if the user explicitly wants them.)
- **Keep the bundle small.** Large dependencies bloat the HTML file. Warn the user before adding anything over ~200KB minified (chart libraries, big UI kits). Prefer lightweight options.
- **Use `@sigmacomputing/plugin` for everything Sigma-related.** Do not hand-roll `postMessage` handlers or parse URL query params yourself — the library already does this and relies on specific shapes.

## When to Stop and Ask

- If the user's idea requires data Sigma doesn't expose (e.g. arbitrary HTTP APIs), call that out before generating code.
- If the bundle is clearly going to be large (user asks for something like D3 + three.js + react-query), flag it and suggest alternatives.
- If you can't confirm an API shape via context7 or the installed `.d.ts`, stop — do not ship guessed hook names.

## Verifying the Deploy

After `sigcli plugins upload-bundle` returns a response with a new `url`, the plugin's production URL in Sigma is now that URL. To sanity-check:

1. Open the URL in a browser — it should render the plugin UI.
2. In the Sigma workbook, the element should load from the new URL (turn off dev mode to see the production bundle).
3. If the plugin doesn't render, check the browser devtools console for script errors and confirm `dist/index.html` opens correctly when loaded locally.
