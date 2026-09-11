#!/usr/bin/env bash
#
# The pinned execution image ships no Doppler CLI, and every non-trivial step
# (wrangler config, `doppler run`, the Lighthouse preview) needs one.
#
# Decision (measured, §7.3 / D10): install per-run. The release artifact is
# doppler_*_linux_arm64.tar.gz, ~4.3 MB (HTTP 200, served from GitHub release
# assets via cli.doppler.com). The installer script itself is ~19 KB. That is a
# few seconds, so Lane 2b (owning a thin `FROM …playwright + one curl line`
# image) is NOT justified for Phase 1 — do not build it speculatively.
set -euo pipefail

if command -v doppler >/dev/null 2>&1; then
	echo "doppler already present: $(doppler --version)"
	exit 0
fi

curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh

command -v doppler >/dev/null 2>&1
echo "doppler installed: $(doppler --version)"
