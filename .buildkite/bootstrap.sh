#!/usr/bin/env bash
#
# Buildkite bootstrap — the port of CircleCI's dynamic-config setup workflow
# (.circleci/config.yml) plus its pipeline parameters (.circleci/config-main.yml).
#
# It computes the same changed-file decision CircleCI's path-filtering orb did,
# then uploads the heavy step set (and, on main when the diff touches landing-page
# files, the Lighthouse step). Nothing here is emitted as a secret: the uploaded
# YAML carries names and decisions only — v4's `pipeline upload` fails by default
# when it detects a secret value.
#
# See .buildkite/README.md for the full port notes, divergences and agent-config
# requirements.
set -euo pipefail

BUILDKITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Run from the repo root so paths in git and the step fragments line up.
cd "$BUILDKITE_DIR/.."

# shellcheck source=scripts/routing.sh
source "$BUILDKITE_DIR/scripts/routing.sh"

# --- base branch: PR base, else main (mirrors `base-revision: main`) ----------
BASE_BRANCH="${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-main}"
if [[ -z "$BASE_BRANCH" || "$BASE_BRANCH" == "false" ]]; then
	BASE_BRANCH="main"
fi

# --- find the merge base (path-filtering diffs base...revision) ---------------
base_revision=""
if git rev-parse --verify --quiet "origin/$BASE_BRANCH^{commit}" >/dev/null 2>&1; then
	base_ref="origin/$BASE_BRANCH"
else
	# The agent may only have fetched BUILDKITE_COMMIT. Fetch just the base
	# branch, blobless, so the diff has the trees it needs.
	git fetch --quiet --filter=blob:none --no-tags origin "$BASE_BRANCH" >/dev/null 2>&1 || true
	base_ref="FETCH_HEAD"
fi

if ! base_revision="$(git merge-base HEAD "$base_ref" 2>/dev/null)"; then
	base_revision=""
fi

# A push to the base branch itself has an EMPTY merge-base diff (the merge base
# is the commit being built), which silences every rule — including
# `run-lighthouse`, so the Lighthouse step could never fire on main. Diff the tip
# commit against its first parent instead, which is what a base-branch push
# actually changed (and, for a merge commit, everything the merge brought in).
if [[ -n "$base_revision" && "$base_revision" == "$(git rev-parse HEAD)" ]]; then
	parent="$(git rev-parse --verify --quiet 'HEAD^' 2>/dev/null || true)"
	if [[ -n "$parent" ]]; then
		base_revision="$parent"
	else
		base_revision="" # root commit: fall through to the safety net
	fi
fi

if [[ -n "$base_revision" ]]; then
	changed_files="$(git diff --name-only "$base_revision" HEAD || true)"
else
	# No common history (orphan branch / force push): fall back to the safety
	# net — run everything.
	changed_files="__NO_COMMON_HISTORY__"
fi

bk_evaluate_routing "$changed_files"

echo "──────────────────────────────────────────────────────────────"
echo "Buildkite routing (port of CircleCI path-filtering)"
echo "  branch:                ${BUILDKITE_BRANCH:-?}"
echo "  base branch:           ${BASE_BRANCH}"
echo "  base (merge-base):     ${base_revision:-<none — safety net>}"
echo "  run-build-test-deploy: ${RUN_BUILD_TEST_DEPLOY}"
echo "  run-lighthouse:        ${RUN_LIGHTHOUSE}"
echo "  changed files:"
if [[ -n "${changed_files//[$'\n']/}" ]]; then
	printf '    %s\n' $changed_files
else
	echo "    (none)"
fi
echo "──────────────────────────────────────────────────────────────"

if command -v buildkite-agent >/dev/null 2>&1; then
	buildkite-agent annotate --style info --context ftn-routing \
		"**Routing** — \`run-build-test-deploy=${RUN_BUILD_TEST_DEPLOY}\`, \`run-lighthouse=${RUN_LIGHTHOUSE}\` (base \`${base_revision:-none}\`)" || true
fi

if [[ "$RUN_BUILD_TEST_DEPLOY" != "true" ]]; then
	echo "Trivial change set (docs/specs/markdown/CI-only) — skipping the heavy pipeline."
	exit 0
fi

# ggshield scans merge-base..HEAD; if we had no merge base, scan the last commit.
scan_base="${base_revision:-HEAD~1}"

sed -e "s|__BASE_REVISION__|${scan_base}|g" \
	"$BUILDKITE_DIR/steps/heavy.yml" |
	buildkite-agent pipeline upload

if [[ "${BUILDKITE_BRANCH:-}" == "main" && "$RUN_LIGHTHOUSE" == "true" ]]; then
	echo "Landing-page diff on main — uploading the Lighthouse step."
	sed -e "s|__BASE_REVISION__|${scan_base}|g" \
		"$BUILDKITE_DIR/steps/lighthouse.yml" |
		buildkite-agent pipeline upload
fi

# ---------------------------------------------------------------------------
# Phase 1: deploys stay DISABLED (decision D6). The ported deploy/deploy-preview
# steps live in .buildkite/steps/deploy.yml but are deliberately NOT uploaded.
# Phase 2 enables them after the parity gate passes:
#
#   if [[ "${BUILDKITE_ENABLE_DEPLOYS:-}" == "true" ]]; then
#     buildkite-agent pipeline upload "$BUILDKITE_DIR/steps/deploy.yml"
#   fi
# ---------------------------------------------------------------------------
