#!/usr/bin/env bash
#
# Equivalent of CircleCI's `ggshield/scan` orb job, with the same pass/fail
# semantics (scan the merge-base..HEAD commit range).
#
# This runs on the AGENT HOST (a plain command step, no docker plugin) so that:
#   * git has whatever credentials the agent used for checkout, which lets a
#     blobless partial clone lazily fetch the base revision's blobs for the diff;
#   * `$PWD` is a real host path, so it can be bind-mounted into the official
#     GitGuardian image (the same image CircleCI's orb uses).
#
# The GitGuardian API key is read from Doppler's REST API using the agent-hook
# DOPPLER_TOKEN. The value never appears in the uploaded pipeline YAML (v4's
# `pipeline upload` scanner would reject that) and is passed to the container by
# env NAME only, never on the command line.
set -euo pipefail

BASE="${SCAN_BASE:-}"
REV="${BUILDKITE_COMMIT:?BUILDKITE_COMMIT is not set}"

if [[ -z "$BASE" || "$BASE" == "HEAD~1" ]]; then
	RANGE="$REV~1..$REV"
else
	RANGE="$BASE..$REV"
fi

: "${DOPPLER_TOKEN:?DOPPLER_TOKEN not in the job environment — is the agent environment hook installed?}"

GITGUARDIAN_API_KEY="$(
	curl -fsS -H "Authorization: Bearer $DOPPLER_TOKEN" \
		"https://api.doppler.com/v3/configs/config/secret?project=common&config=stg&name=GITGUARDIAN_API_KEY" |
		sed -n 's/.*"raw"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'
)"
if [[ -z "$GITGUARDIAN_API_KEY" ]]; then
	echo "ERROR: could not read GITGUARDIAN_API_KEY from Doppler (project common / config stg)."
	exit 1
fi
export GITGUARDIAN_API_KEY

# Pinned: GitGuardian publish multi-arch (amd64 + arm64) images.
GGSHIELD_IMAGE="gitguardian/ggshield:v1.54.0"

echo "ggshield: materialising ${RANGE} on the host (blobless checkout + host credentials)"
# The checkout is a blobless partial clone; `git diff` for the range lazily
# fetches the missing blobs. Do that here, on the host, where the agent's
# checkout credentials are available — the container has no `.ssh` and no token.
git diff "$RANGE" >/dev/null

echo "ggshield: scanning commit range ${RANGE}"
# The published image declares no ENTRYPOINT (Cmd is `ggshield`), so the
# command must be spelled out in full or Docker tries to exec "secret".
docker run --rm \
	--volume "$PWD:/data" \
	--workdir /data \
	--env GITGUARDIAN_API_KEY \
	"$GGSHIELD_IMAGE" \
	ggshield secret scan commit-range "$RANGE"
