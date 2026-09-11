#!/usr/bin/env bash
#
# Circular-CI "path-filtering" mapping, ported verbatim from
# .circleci/config.yml (setup workflow).
#
# Semantics (matches circleci/path-filtering@3.0.0):
#   * The orb joins the changed-file list into a single string and tests each
#     mapping line's regex against that whole string, in mapping order.
#   * For a given parameter the LAST matching line wins.
#   * `run-build-test-deploy` defaults to true (the safety net): it only becomes
#     false when the change set matches a "trivial" rule and no later rule
#     (webapp/, package.json, package-lock.json) flips it back to true.
#   * `run-lighthouse` defaults to false and is opt-in.
#
# bk_evaluate_routing "<newline-separated changed files>"
#   -> sets globals RUN_BUILD_TEST_DEPLOY ("true"/"false")
#              and   RUN_LIGHTHOUSE       ("true"/"false")
bk_evaluate_routing() {
	# NOTE: keeps the mapping table byte-for-byte the same as CircleCI's, so the
	# two providers can be diffed by eye. The only addition is `.buildkite/.*`
	# (a Buildkite-only CI change is trivial in exactly the way `.circleci/.*`
	# is); see .buildkite/README.md "Divergences".
	local changes="$1"
	local regex param value

	RUN_BUILD_TEST_DEPLOY="true"
	RUN_LIGHTHOUSE="false"

	while read -r regex param value; do
		[[ -z "${regex:-}" ]] && continue
		if [[ "$changes" =~ $regex ]]; then
			case "$param" in
			run-build-test-deploy) RUN_BUILD_TEST_DEPLOY="$value" ;;
			run-lighthouse) RUN_LIGHTHOUSE="$value" ;;
			esac
		fi
	done <<'MAPPING'
docs/.* run-build-test-deploy false
specs/.* run-build-test-deploy false
.*\.md run-build-test-deploy false
.circleci/.* run-build-test-deploy false
.buildkite/.* run-build-test-deploy false
webapp/.* run-build-test-deploy true
package.json run-build-test-deploy true
package-lock.json run-build-test-deploy true
webapp/src/routes/\+page\.svelte run-lighthouse true
webapp/src/routes/\+layout\.svelte run-lighthouse true
webapp/src/routes/\+error\.svelte run-lighthouse true
webapp/src/lib/components/(About|Contact|Experience|Footer|Header|Landing|Navbar|Projects)\.svelte run-lighthouse true
webapp/src/app\.css run-lighthouse true
webapp/static/.* run-lighthouse true
webapp/src/lib/icons/.* run-lighthouse true
webapp/src/lib/images/.* run-lighthouse true
MAPPING

	export RUN_BUILD_TEST_DEPLOY RUN_LIGHTHOUSE
}
