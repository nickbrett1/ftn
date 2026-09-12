#!/bin/bash
# Check that a Doppler project's configs expose the same *set of secret names*.
#
# Drift between environments is a common cause of "works in dev, fails in stg/prd"
# deployments: a config that is missing a secret name (or has a stale extra one)
# looks fine until the code that reads it runs in that environment.
#
# This script compares NAMES ONLY. It never fetches or prints secret values, so it
# is safe to run locally and in CI.
#
# Usage:
#   ./scripts/check-doppler-alignment.sh [options]
#
# Options:
#   --project <name>       Doppler project to check (repeatable, default: webapp)
#   --configs <a,b,c>      Configs to compare (default: dev,stg,prd)
#   -h | --help            Show this help
#
# Exit codes:
#   0  every config in every checked project exposes the same secret names
#   1  drift found (or a config could not be read)
#
# Requires: doppler CLI, jq, and either `doppler login` or DOPPLER_TOKEN.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBAPP_DIR="$(dirname "$SCRIPT_DIR")"
cd "$WEBAPP_DIR"

PROJECTS=()
CONFIGS="dev,stg,prd"

while [[ "$#" -gt 0 ]]; do
	case $1 in
		--project)
			PROJECTS+=("$2")
			shift 2
			;;
		--configs)
			CONFIGS="$2"
			shift 2
			;;
		-h | --help)
			sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'
			exit 0
			;;
		*)
			echo "Unknown parameter: $1" >&2
			exit 1
			;;
	esac
done

# Respect doppler.yaml's project when no --project was given.
if [ "${#PROJECTS[@]}" -eq 0 ]; then
	default_project="$(sed -n 's/^[[:space:]]*project:[[:space:]]*//p' doppler.yaml 2>/dev/null | head -1)"
	PROJECTS=("${default_project:-webapp}")
fi

if ! command -v doppler &> /dev/null; then
	echo "❌ Error: Doppler CLI is not installed or not in PATH" >&2
	exit 1
fi
if ! command -v jq &> /dev/null; then
	echo "❌ Error: jq is not installed or not in PATH" >&2
	exit 1
fi

# Build shared doppler args. A service token (dp.st.) is pinned to one
# project/config, so project/config flags must be omitted when using one.
DOPPLER_ARGS=()
if [ -n "${DOPPLER_TOKEN:-}" ]; then
	DOPPLER_ARGS+=(--token "$DOPPLER_TOKEN")
elif ! doppler whoami &> /dev/null; then
	echo "❌ Error: Not authenticated with Doppler. Run 'doppler login' or set DOPPLER_TOKEN." >&2
	exit 1
fi

IFS=',' read -r -a CONFIG_LIST <<< "$CONFIGS"

drift_found=false
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

for project in "${PROJECTS[@]}"; do
	project_tmp="$tmp_dir/$project"
	mkdir -p "$project_tmp"
	read_ok=true

	for config in "${CONFIG_LIST[@]}"; do
		args=("${DOPPLER_ARGS[@]}")
		# Service tokens cannot accept --project/--config.
		if [ "${#DOPPLER_ARGS[@]}" -eq 0 ] || [ "${DOPPLER_ARGS[0]:-}" != "--token" ]; then
			args+=(--project "$project" --config "$config")
		fi
		if ! doppler secrets --only-names --json "${args[@]}" 2>/dev/null | jq -r 'keys[]' | sort > "$project_tmp/$config.txt"; then
			echo "❌ Error: could not read secret names for ${project}/${config}" >&2
			read_ok=false
			continue
		fi
	done

	if [ "$read_ok" != true ]; then
		drift_found=true
		continue
	fi

	echo "🔎 Doppler project: ${project} (configs: ${CONFIGS})"

	# Union of all names across configs.
	cat "$project_tmp"/*.txt | sort -u > "$project_tmp/union.txt"

	project_drift=false
	for config in "${CONFIG_LIST[@]}"; do
		grep -vxF -f "$project_tmp/$config.txt" "$project_tmp/union.txt" > "$project_tmp/missing_$config.txt" || true
		if [ -s "$project_tmp/missing_$config.txt" ]; then
			project_drift=true
			echo "  ⚠️  ${config} is MISSING:"
			sed 's/^/      - /' "$project_tmp/missing_$config.txt"
		fi
	done

	if [ "$project_drift" = true ]; then
		echo "  ❌ Secret names are NOT aligned across ${CONFIGS} in ${project}"
		drift_found=true
	else
		count="$(wc -l < "$project_tmp/union.txt" | tr -d ' ')"
		echo "  ✅ Aligned: ${count} secret names present in every config"
	fi
done

if [ "$drift_found" = true ]; then
	echo ""
	echo "Doppler configs have drifted. Add/remove the names above so every config exposes the same keys."
	exit 1
fi

echo ""
echo "✅ All checked projects are aligned."
