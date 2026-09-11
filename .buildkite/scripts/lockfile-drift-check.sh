#!/usr/bin/env bash
#
# Port of the CircleCI "Lockfile drift check" step, with an identical failure
# mode: re-resolve the lockfile; if it changes, package.json and
# package-lock.json have drifted (a Dependabot or hand edit bumped one but not
# the other) and the build hard-fails.
#
# Runs from the repo root.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../../webapp"

cp package-lock.json /tmp/lock.orig

# If package.json and package-lock.json are in sync this is a no-op.
npm install --package-lock-only --ignore-scripts

if ! cmp -s package-lock.json /tmp/lock.orig; then
	cp /tmp/lock.orig package-lock.json
	echo "ERROR: webapp/package-lock.json is out of sync with webapp/package.json."
	echo "Run 'cd webapp && npm install --package-lock-only' and commit the result."
	exit 1
fi

echo "OK: package-lock.json is in sync with package.json."
