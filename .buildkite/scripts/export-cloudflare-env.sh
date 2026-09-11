#!/usr/bin/env bash
# Resolve the Cloudflare credentials CircleCI injected via its `context: common`.
#
# Buildkite has no context equivalent, so we fetch them from Doppler at runtime —
# the same pattern ggshield-scan.sh uses for its API key. Without this, wrangler
# fails in a non-interactive environment:
#   "it's necessary to set a CLOUDFLARE_API_TOKEN environment variable"
#
# This file MUST be SOURCED (`. path` / `source path`), not executed, so the
# exports persist for the later commands in the step.
#
# Usage: . .buildkite/scripts/export-cloudflare-env.sh [doppler-config]
#
# Prints names only, never values.
config="${1:-stg}"

if [[ -z "${DOPPLER_TOKEN:-}" ]]; then
	echo "❌ DOPPLER_TOKEN is not in the job environment" >&2
	exit 1
fi

for name in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID; do
	value="$(doppler secrets get "$name" --project common --config "$config" --plain 2>/dev/null || true)"
	if [[ -z "$value" ]]; then
		echo "❌ Doppler returned an empty value for ${name} (common/${config})" >&2
		exit 1
	fi
	export "${name}=${value}"
	echo "✅ ${name} set from Doppler (common/${config})"
done
