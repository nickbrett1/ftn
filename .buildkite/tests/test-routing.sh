#!/usr/bin/env bash
#
# Unit tests for the ported path-filtering mapping (.buildkite/scripts/routing.sh).
# Run: bash .buildkite/tests/test-routing.sh
#
# Every case is written as "changed file list -> expected (build, lighthouse)".
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../scripts/routing.sh
source "$HERE/../scripts/routing.sh"

failures=0
cases=0

# check <name> <newline-separated changed files> <expected build> <expected lh>
check() {
	local name="$1" changes="$2" want_build="$3" want_lh="$4"
	cases=$((cases + 1))
	bk_evaluate_routing "$changes"
	if [[ "$RUN_BUILD_TEST_DEPLOY" != "$want_build" || "$RUN_LIGHTHOUSE" != "$want_lh" ]]; then
		echo "FAIL: $name"
		echo "      got  build=$RUN_BUILD_TEST_DEPLOY lighthouse=$RUN_LIGHTHOUSE"
		echo "      want build=$want_build lighthouse=$want_lh"
		failures=$((failures + 1))
	else
		echo "ok:   $name (build=$RUN_BUILD_TEST_DEPLOY lighthouse=$RUN_LIGHTHOUSE)"
	fi
}

# --- trivial change sets skip the heavy pipeline ---------------------------
check "docs only" $'docs/design.md' false false
check "specs only" $'specs/001-thing/spec.md' false false
check "markdown only" $'README.md' false false
check "root markdown only" $'CONTRIBUTING.md' false false
check ".circleci only" $'.circleci/config.yml' false false
check ".buildkite only" $'.buildkite/pipeline.yml' false false
check "docs + specs" $'docs/a.md\nspecs/b/c.md' false false

# --- webapp / dependency changes run the heavy pipeline --------------------
check "webapp source" $'webapp/src/lib/utils/foo.js' true false
check "package.json" $'package.json' true false
check "package-lock.json" $'package-lock.json' true false
check "webapp lockfile" $'webapp/package.json\nwebapp/package-lock.json' true false

# --- landing-page diffs additionally enable Lighthouse ---------------------
check "+page.svelte" $'webapp/src/routes/+page.svelte' true true
check "+layout.svelte" $'webapp/src/routes/+layout.svelte' true true
check "+error.svelte" $'webapp/src/routes/+error.svelte' true true
check "About component" $'webapp/src/lib/components/About.svelte' true true
check "Landing component" $'webapp/src/lib/components/Landing.svelte' true true
check "app.css" $'webapp/src/app.css' true true
check "static asset" $'webapp/static/images/hero.webp' true true
check "icon" $'webapp/src/lib/icons/logo.svg' true true
check "image" $'webapp/src/lib/images/bg.png' true true

# --- non-landing webapp change: heavy but no Lighthouse --------------------
check "other webapp source" $'webapp/src/lib/utils/foo.js' true false
check "other component" $'webapp/src/lib/components/Button.svelte' true false

# --- ordering: a later "true" rule beats an earlier "false" rule -----------
check "docs + webapp" $'docs/a.md\nwebapp/src/lib/utils/foo.js' true false
check "docs + landing page" $'docs/a.md\nwebapp/src/routes/+page.svelte' true true
check "readme + webapp" $'README.md\nwebapp/src/lib/utils/foo.js' true false

# --- safety net: an empty / unknown change set still runs everything -------
check "empty change set" "" true false
check "no common history" $'__NO_COMMON_HISTORY__' true false
check "unmapped path" $'scripts/whatever.sh' true false

echo "──────────────────────────────────────────────"
if [[ "$failures" -ne 0 ]]; then
	echo "FAILED: $failures of $cases cases"
	exit 1
fi
echo "PASSED: all $cases routing cases"
