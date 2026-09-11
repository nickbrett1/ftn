#!/usr/bin/env bash
#
# A missing DOPPLER_PROJECT / DOPPLER_ENVIRONMENT fails SILENTLY: setup-wrangler-
# config.sh never writes wrangler.jsonc and the build carries on regardless. So
# assert on the generated file instead of trusting exit codes.
#
# Runs from the repo root (build/ci scripts `cd webapp` first).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../../webapp"

if [[ ! -f wrangler.jsonc ]]; then
	echo "ERROR: webapp/wrangler.jsonc was not generated."
	echo "       Check DOPPLER_PROJECT and DOPPLER_ENVIRONMENT (and that DOPPLER_TOKEN reached the container)."
	exit 1
fi

if grep -q 'PLACEHOLDER' wrangler.jsonc; then
	echo "ERROR: webapp/wrangler.jsonc still contains template placeholders — substitution failed."
	exit 1
fi

echo "OK: webapp/wrangler.jsonc generated and substituted."
