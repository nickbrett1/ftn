# Agent Information and Known Issues

This document provides information for AI agents working on this codebase.

## Unresolved Security Vulnerability: `node-tar`

A security vulnerability exists in `node-tar@7.5.1`, which is a bundled dependency of `npm@11.6.2`. This is a transitive dependency and cannot be resolved using `npm overrides` because it is bundled within the `npm` package itself.

- **Vulnerability:** Race condition leading to uninitialized memory exposure.
- **Tracked as:** #85
- **Patched Version:** 7.5.2
- **Current Version:** 7.5.1 (bundled in `npm@11.6.2`)

**Resolution attempts:**
- Using `overrides` in `package.json` to force `tar@7.5.2` was unsuccessful because bundled dependencies are not affected by this mechanism.

**Next Steps:**
- This vulnerability will remain until the `npm` package itself is updated to include a patched version of `tar`. No further action can be taken at this time.
