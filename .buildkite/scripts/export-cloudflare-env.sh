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
# POSIX-only on purpose: sourcing happens inside the docker plugin's `sh -e -c`
# (dash on Debian), where bashisms are fatal or silent. Two bugs came from that:
#
#   1. `[[ ]]` is bash-only. Under dash it printed "[: not found" and the test
#      never ran, so the guards below were dead code — a missing DOPPLER_TOKEN
#      or an empty Doppler value sailed straight past them.
#   2. dash's `.` builtin IGNORES arguments, so `. <this-file> prd` set
#      config=stg (the default). Callers must use CF_DOPPLER_CONFIG instead;
#      $1 is still honoured, but only by shells that implement POSIX `.` args.
#
# Usage: CF_DOPPLER_CONFIG=prd . .buildkite/scripts/export-cloudflare-env.sh
#
# Prints names only, never values.
config="${CF_DOPPLER_CONFIG:-${1:-stg}}"

if [ -z "${DOPPLER_TOKEN:-}" ]; then
	echo "❌ DOPPLER_TOKEN is not in the job environment" >&2
	exit 1
fi

for name in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID; do
	value="$(doppler secrets get "$name" --project common --config "$config" --plain 2>/dev/null || true)"
	if [ -z "$value" ]; then
		echo "❌ Doppler returned an empty value for ${name} (common/${config})" >&2
		exit 1
	fi
	export "${name}=${value}"
	echo "✅ ${name} set from Doppler (common/${config})"
done
