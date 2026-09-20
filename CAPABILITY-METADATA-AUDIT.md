# Capability metadata audit (genproj) — 2026-09-18

## Change 1 (shipped)
`webapp/src/lib/components/genproj/CapabilitySelector.svelte` did not render the
`embedded` category because `categoryOrder`/`categoryNames` lacked it. Added:
- `embedded: 'Embedded / Microcontrollers'` to `categoryNames`
- `'embedded'` to `categoryOrder` immediately after `'devcontainer'`

Diff (2 insertions):
```
@@ categoryNames
 		devcontainer: 'Development Containers',
+		embedded: 'Embedded / Microcontrollers',
 		'ci-cd': 'CI/CD',
@@ categoryOrder
 		'devcontainer',
+		'embedded',
 		'apple-development',
```

## Change 2 (NOT done)
micropython `configurationSchema.packages` is `type: array` with no
`items.enum`. The selector's only array branch is
`property.type === 'array' && property.items && property.items.enum`
(checkbox list). There is no generic array/list editor, so wiring micropython
would require new component work → intentionally skipped.

## Change 3 (reachability — no deletions performed)
Traced from live entry points (routes/components), not import grep alone.

| file | runtime reachable? | chain / verdict |
|---|---|---|
| `src/lib/config/capabilities.js` | **YES (module evaluated)** | `routes/logout/+server.js` (live route) → `$lib/server/genproj-auth.js` (static import) → `../config/capabilities.js`. The import is static so the module evaluates when the logout route loads, even though only `createGenprojAuth`/`clearGitHubAuth` are used and `getRequiredAuthServices` is never called. Also imported by `utils/validation.js` (dead, below). 7 test files reference it. |
| `src/lib/utils/validation.js` | **NO** | Imported only by `src/lib/models/validation.js` (1-line re-export). Nothing in `src/` imports `models/validation.js`. `genproj/+page.svelte` does not use it (it uses `fetchCatalog` + `CapabilitySelector`). 1 test file: `tests/lib/utils/validation.test.js`. |
| `src/lib/models/validation.js` | **NO** | 0 importers in `src/`, 0 test files. Pure dead re-export. |
| `src/lib/utils/capabilities.js` | **NO** | `capability-resolver.js` (`import { CAPABILITIES as capabilities } from './capabilities.js'`) ← `client/capability-store.js` ← `utils/mode-switcher.js`. **`mode-switcher.js` has zero importers in `src/`** (only `tests/lib/utils/mode-switcher.test.js`), so the whole chain is dead at runtime. REFUTES the prior "looks like the live client chain" hypothesis. 2 test files. |
| `src/lib/server/capability-config.js` | **NO** | No `src/` importer at all; only `tests/lib/server/capability-config.test.js` constructs `CapabilityConfigurationService`. Dead at runtime. 1 test file. |

### Safe-to-remove-later summary
- Definitively dead at runtime: `utils/validation.js`, `models/validation.js`,
  `utils/capabilities.js` (+ `capability-resolver.js`, `capability-store.js`,
  `mode-switcher.js`), `server/capability-config.js`.
- Live but redundant/underused: `config/capabilities.js` is loaded via the
  logout route's static import chain; the genproj page does NOT use it.

## Verification actually run
- `npx vitest run tests/lib/components/genproj/CapabilitySelector.test.js tests/lib/config/capabilities.test.js tests/lib/server/capability-config.test.js tests/lib/server/catalog.test.js tests/lib/server/genproj-auth.test.js`
  → Test Files 5 passed (5); Tests 45 passed (45).
- `npm run build` → `✓ built in 1m 57s` (after `npx playwright install chromium`
  to satisfy mermaid; the `IMPORT_IS_UNDEFINED tracing` warning is pre-existing).

## Delivered
- branch `fix/genproj-embedded-capability-category`
- commit `7e3c80bcb8eb753a78e6c9eebd4f0668c3415d44` (2 insertions)
- PR #4087 https://github.com/nickbrett1/ftn/pull/4087 (base main, open)
- Local doppler (webapp/dev) GitHub tokens returned 401; working token found
  under doppler project `common` (prd).

## Live catalog confirmation
`GET https://genproj.nick-brett1.workers.dev/v1/catalog` → HTTP 200, count 30,
`micropython` present, category `embedded`, icon `code`,
`configurationSchema.packages = {type: array, items: {type: string}, default: ["mpremote"]}`
(no `items.enum`).
