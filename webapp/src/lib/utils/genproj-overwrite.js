/**
 * Overwrite-policy classification for genproj regeneration (round 3 + feedback).
 *
 * When a project is regenerated with `overwrite: true`, each generated file is
 * treated according to WHO OWNS its path:
 *
 * - Merge-target files (`.devcontainer/devcontainer.json`) accumulate capability
 *   contributions + manual edits → they are MERGED (round 4).
 * - App-owned paths (`src/`, `tests/`, `scripts/`, `worker/`, `app/`) contain
 *   the user's code (e.g. `src/<pkg>/__main__.py`, `scripts/entrypoint.sh`).
 *   A diverged app file is NEVER replaced unless the user explicitly resolves
 *   that path to `overwrite` (round 3 — protects against scaffold clobbering).
 * - Everything else is generated INFRA (Dockerfile, `.circleci/`, `.devcontainer/`,
 *   `pyproject.toml`, `package.json`, compose, README, ...). Infra is
 *   genproj-owned: on regeneration the fresh template content wins so template
 *   improvements (e.g. doppler install in the Dockerfile) actually propagate,
 *   unless the user explicitly resolves the path to `keep`.
 *
 * The UI conflict modal mirrors this: app-owned conflicts default to `keep`,
 * infra conflicts default to `overwrite`.
 */

const APP_OWNED_PATH_PREFIXES = ['src/', 'tests/', 'scripts/', 'worker/', 'app/'];

// Genproj-generated helper scripts that live under the app-owned `scripts/`
// prefix but are INFRA (template-owned), not user code: cloud_login.sh and the
// wrangler/doppler helpers are emitted by genproj and must be updated on
// regeneration, or they go stale (e.g. parquet-peek's cloud_login.sh kept its
// pre-doppler form — no doppler login block — through two regenerations
// because the whole scripts/ prefix was treated as app code).
// Genuinely user-owned scripts (e.g. the docker-container
// `scripts/entrypoint.sh` contract) remain app-owned. Keep this list in sync
// with the `scripts/` filePaths emitted by file-generator.js and
// capabilities.js.
const GENPROJ_OWNED_SCRIPTS = new Set([
	'scripts/cloud_login.sh',
	'scripts/run-wrangler-dev.sh',
	'scripts/setup-wrangler-config.sh',
	'scripts/sync-doppler-secrets.sh'
]);

/**
 * True when the path is user/app-owned code that must never be silently
 * replaced by a scaffold on regeneration. Genproj-owned helper scripts under
 * scripts/ (cloud_login.sh, wrangler/doppler helpers) are NOT app-owned: they
 * are regenerated infra and the fresh template content must win on regen.
 * @param {string} filePath - Generated file path
 * @returns {boolean} True when the path is app-owned
 */
export function isAppOwnedPath(filePath) {
	if (GENPROJ_OWNED_SCRIPTS.has(filePath)) return false;
	return APP_OWNED_PATH_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

/**
 * Files that accumulate capability contributions across regenerations and must
 * be MERGED (not skipped, not clobbered) when they diverge. Round-4
 * (memo genproj-fixes-round4): devcontainer.json is the single known case —
 * its final state is the union of (capability contributions) + (manual edits).
 * @param {string} filePath - Generated file path
 * @returns {boolean} True when the file is a merge-target
 */
export function isMergeTargetFile(filePath) {
	return filePath === '.devcontainer/devcontainer.json';
}
