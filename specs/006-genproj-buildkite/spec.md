# Feature Specification: genproj "Buildkite" CI Capability

**Status**: Draft (v1 scope: capability + pipeline provisioning)
**Created**: 2026-09-11
**Motivating use case**: ftn's migration to Buildkite (Phases 1–2 complete). The owner's explicit requirement: a generated project must **not** need a manual "set up the project" step — genproj should create the pipeline itself.
**Depends on**: `[[buildkite-phase1-ftn-results]]` (the proven pipeline), `[[DFSsNwAc8NXcKSQsA2SJNb]]` §8 (capability sketch), D12 (the `BUILDKITE_TOKEN`).

---

## 1. Problem

genproj has one CI capability, `circleci`. Generating with it produces `.circleci/config.yml` **and** provisions the provider: `project-generator.js#configureCircleCI` calls `followProject(...)`, verifies CircleCI installed its push webhook, and triggers the first pipeline — tolerating the GitHub-indexing race with backoff rather than failing generation.

Buildkite has no such capability, and three hard-won facts from the ftn port must shape it:

1. **A pipeline created through the API has no GitHub webhook.** ftn's first pushes produced *nothing* while the connection and `build_branches` looked healthy. The fix is an undocumented endpoint, `POST /v2/organizations/{org}/pipelines/{slug}/webhook`, which returns 201 and registers it. Without this, "genproj creates the pipeline" is a hollow promise — the repo looks wired up and never builds.
2. **The API rejects an omitted `configuration`, and an empty string yields a zero-step `not_run` build.** It does *not* fall back to `.buildkite/pipeline.yml`. The pipeline must be provisioned with the standard one-step wrapper that uploads the repo file.
3. **`cluster_id` is mandatory** for pipeline creation in this organisation (Default cluster `25e535fa-b23a-48bb-8588-1b1454fcfef8`).

### Non-goals (v1)

- No per-project agent, no second queue, no agent provisioning.
- No multi-tenant design for the shared queue (see §8, the fork-PR question).
- No Lighthouse or deploy steps in the generated pipeline (both are still unexercised on ftn itself — see §8).
- No change to the `doppler` capability; Buildkite declares it as a dependency exactly as `circleci` does (the build genuinely calls `doppler run`).

---

## 2. Capability definition

Machine-readable contract: `contracts/buildkite.capability.json`. Summary:

| field | value |
|---|---|
| `id` | `buildkite` |
| `category` | `CATEGORY_CI_CD` |
| `dependencies` | `['doppler']` (mirrors `circleci` — the generated build runs `doppler run`) |
| `conflicts` | `[]` — coexistence with `circleci` is a *feature* during migration |
| `configurationSchema` | `queue`, `branchGating`, `ntfyNotifications`, `provisionPipeline` |
| `templates` | `.buildkite/pipeline.yml`, `.buildkite/bootstrap.sh`, `.buildkite/scripts/routing.sh`, `.buildkite/scripts/lockfile-drift-check.sh`, `.buildkite/scripts/install-doppler-cli.sh` |

Deliberately **not** in the v1 schema (each was proposed in the plan's §8 sketch, each has a reason to stay internal):

- `dockerImage` / `dockerImageDigest` — the pin is a proven-by-testing artifact, not a user preference. Letting users set a digest invites a broken browser revision. It stays a template constant; revisit only if a second fleet needs a different image.
- `agentVersion`, `caching`, `propagatedEnvNames` — implementation detail of the pipeline, already fixed by the ftn port.
- `requiresDopplerCli` — always true.

---

## 3. Provisioning flow

Mirrors `#configureCircleCI`, with the Buildkite specifics:

```
1. createPipeline(org, { name, repository, cluster_id, default_branch })
     - 422 "already exists"         -> treat as success (idempotent regeneration)
     - 404 / "repository not found" -> the GitHub App has not indexed the new
                                       repo yet; retry with backoff, then record
                                       pendingSync (do not fail generation)
2. setPipelineConfiguration(slug, wrapper)   // never omitted, never empty
3. registerWebhook(slug)                     // POST .../webhook -- 201
4. verifyWebhook(slug)                       // provider.webhook_url present AND a
                                             // delivery has been observed; warn loudly
                                             // if not (see §1.1)
5. triggerFirstBuild(slug, default_branch)   // best-effort, mirrors triggerPipeline
```

Every step is **best-effort with a recorded result**, exactly like CircleCI's: a provisioning failure must not fail generation, but it must be *visible* in the generation report and in the UI.

`#4` deserves emphasis: CircleCI's equivalent check (`#hasCircleCIWebhook`) exists precisely because "followed" ≠ "wired up". Buildkite has the same failure mode, one layer deeper — the pipeline exists, has a `webhook_url`, and still receives nothing.

**Idempotency.** Regenerating a project must not fail on an existing pipeline. `createPipeline` treats a "name already exists" error as success and continues to the webhook step (which is itself idempotent).

---

## 4. Templates

Copied from the ftn port, then parameterised — the ftn files *are* the reference implementation. Divergences from the ftn originals:

| Template | Divergence |
|---|---|
| `.buildkite/pipeline.yml` | target `queue` from config instead of the literal `mac-studio-linux` |
| `.buildkite/steps/heavy.yml` | **Lighthouse step omitted** (unproven — §8); deploy step omitted (D6) |
| `.buildkite/bootstrap.sh`, `scripts/routing.sh` | verbatim — the mapping table and its 28 test cases are the ported semantics |
| `scripts/lockfile-drift-check.sh`, `scripts/install-doppler-cli.sh` | verbatim |

Generated repos are Python/Node/etc., so the heavy steps must be **language-aware**, matching how CircleCI's template data already switches on language (`activate_pinned_npm`, the lint step). v1 supports the same languages the CircleCI template does; where a language has no proven Buildkite equivalent, the template emits the same commands CircleCI would (the image already contains Node; other languages use the same apt/curl shape).

The **test file** (`.buildkite/tests/test-routing.sh`) ships too — it is the regression net for the mapping logic and costs nothing.

---

## 5. Secrets

- `BUILDKITE_TOKEN` lives in Doppler `webapp/prd` and syncs to the Cloudflare worker (D12). It is a **write-scoped org token** (`write_pipelines`, `read_clusters`, builds).
- The generated repo never contains a token. The generated pipeline receives `DOPPLER_TOKEN` from the **generated project's own agent hook**, not from this repo.
- **Open (needs a decision before implementation):** generated projects land on the *same* self-hosted agent as ftn. That agent's `DOPPLER_TOKEN` is account-wide (D10), so a generated project's build can read *every* Doppler config. That was accepted for a single-owner fleet; it needs to be a conscious acceptance for generated repos too, or a narrower token per project.

---

## 6. UI touchpoints

`CapabilitySelector` renders from the catalog, so a new capability appears without UI code — but the CI category currently reads as CircleCI-shaped (the orb/context language in descriptions). The `buildkite` entry's `description`/`benefits`/`externalServices` text must stand alone.

---

## 7. Implementation touchpoints

| Concern | File |
|---|---|
| Capability entry | `webapp/src/lib/config/capabilities.js` |
| Service config (baseUrl, auth, env var name, rate limit) | `webapp/src/lib/config/external-services.js` |
| API client (`createPipeline`, `setConfiguration`, `registerWebhook`, `triggerBuild`) | **new** `webapp/src/lib/server/buildkite-api.js` (mirrors `circleci-api.js`) |
| Provisioning orchestration | `webapp/src/lib/server/project-generator.js` (`#configureBuildkite`) |
| Template data (language-aware steps) | `webapp/src/lib/utils/capability-template-utils.js` |
| Templates | `webapp/src/lib/templates/buildkite-*.template` |
| Path mapping | `webapp/src/lib/server/template-engine.js` (`generateFilePath`) |
| Validation | `webapp/src/lib/utils/validation.js` |
| Tests | `webapp/tests/lib/server/*` + template fixtures |

---

## 8. Open questions

1. **Fork PRs on a public queue.** `build_pull_requests: true` + a public repo + a self-hosted agent = arbitrary code from a fork running on the Mac Studio. Buildkite has fork-PR controls (`build_pull_request_forks`, `prefix_pull_request_fork_branch_names`); the ftn pipeline leaves `build_pull_request_forks` false. Generated public repos should probably follow the same default, but this needs an explicit decision — it is the one genuinely security-shaped question in this spec.
2. **Lighthouse and deploy steps.** ftn's are unproven (no landing-page change has exercised Lighthouse; deploys are off by D6). Ship them in generated pipelines, commented out, or omit entirely for v1?
3. **Language coverage.** Which languages get a first-class Buildkite template in v1, and which fall back to a generic "put your commands here" step?
4. **Where does `org`/`cluster_id` come from?** Config fields, or constants in the service config? (Constants are simpler and correct for a single-org fleet; config fields are needed the moment a second organisation appears.)
5. **Does the capability also emit `doppler.yaml`/agent-hook guidance?** The generated pipeline needs `DOPPLER_TOKEN` in the *generated* project's job env, which means the owner must install an agent hook (or a per-project secret) — currently undocumented for generated repos.
