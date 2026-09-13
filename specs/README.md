# Specs

Design documents for the features in this repository.

| Spec | What it covers |
| ---- | -------------- |
| [`002-virtual-shop`](002-virtual-shop) | The virtual shop and Stripe checkout. |
| [`004-govee-mcp`](004-govee-mcp) | The Govee MCP server. |
| [`005-goose-multi-session-worktree`](005-goose-multi-session-worktree) | Multi-session workspaces for goose. |

## Moved to genproj

Three specs lived here because the generator lived here. Both have moved:

- `001-genproj`
- `003-genproj-docker-container`
- `006-genproj-buildkite`

They are now in [`nickbrett1/genproj`](https://github.com/nickbrett1/genproj)
under `specs/`. This repository no longer contains the generator — project
generation is a service, reached over a Cloudflare service binding, and the code
that implements it, its templates and its specs all live in that repository.

### Two things that are easy to get wrong

**There is no generator here.** No `src/generator/`, no `file-generator.js`, no
templates, no template precompile step. If you are looking for those, you are in
the wrong repository.

**`capability-template-utils.js` exists in both repositories, and both are
live.** In this one it is `webapp/src/lib/utils/capability-template-utils.js`,
used by `external-service-integration.js` for `resolveDopplerTarget`. In genproj
it is `src/generator/capability-template-utils.js`, the generator's template data
builders. Same filename, different jobs — a grep across both repositories shows
two hits and neither is stale.
