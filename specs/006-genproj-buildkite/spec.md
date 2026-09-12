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
| `dependencies` | `[]` — v1 does not run `doppler run` in the pipeline, so unlike `circleci` it needs nothing else selected |
| `conflicts` | `[]` — coexistence with `circleci` is a *feature* during migration |
| `configurationSchema` | `queue`, `provisionPipeline` |
| `templates` | `.buildkite/pipeline.yml`, `.buildkite/README.md` |

Deliberately **not** in the v1 schema (each was proposed in the plan's §8 sketch, each has a reason to stay internal or to arrive with the step it configures):

- `dockerImage` / `dockerImageDigest` — the image is chosen from the language (§4), not by preference. Letting users set a digest invites a broken revision.
- `agentVersion`, `caching`, `propagatedEnvNames`, `requiresDopplerCli` — implementation detail of the pipeline, already fixed by the ftn port.
- `branchGating`, `ntfyNotifications` — these gate Lighthouse/deploy steps and deploy notifications. v1 emits neither step, so they would be dead configuration; they belong with those steps in a v2.

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

Two files, deliberately. `.buildkite/pipeline.yml` is the pipeline; `.buildkite/README.md` documents the part a generated repo cannot contain — the agent-side prerequisites (queue, `plugins-path`, and the rule that a step-level `env:` value never reaches a container). Both are required: without the README, the first failure looks like the project's fault.

| Template | Shape |
|---|---|
| `.buildkite/pipeline.yml` | one job: install → build → lint → test, with `agents: queue:` from config |
| `.buildkite/README.md` | the queue, the image, and the four agent prerequisites |

**Language-aware**, keyed off `resolveLanguage(context)` (the same helper the CircleCI template uses), with a per-language image:

| language | image | commands |
|---|---|---|
| `node` (default) | `node:22-bookworm` | `npm ci --no-audit --no-fund --prefer-offline`, then `npm run build/lint/test --if-present`; adds `npx playwright install --with-deps chromium` when the `playwright` capability is present |
| `python` | `python:3.13-slim` | `pip install --no-cache-dir -e ".[dev]"`, `ruff check src tests`, `pytest -q` |
| `rust` | `rust:1-slim` | `cargo build --locked`, `cargo test --locked` |
| `java` | `eclipse-temurin:21-jdk` | explains that genproj generates a devcontainer but no build system, rather than failing on the first push |

### Why this is smaller than ftn's pipeline

ftn carries a bootstrap + `routing.sh` + `steps/heavy.yml` split whose entire purpose is **path filtering** (docs-only commits skip the heavy set). Two reasons it is not here:

1. **Parity.** The generated CircleCI config does not path-filter either — ftn's dynamic config was a later, repo-specific addition. Shipping path filtering would make the Buildkite capability more capable than the one it replaces, which is scope creep, not parity.
2. **It is the expensive part to get wrong.** The mapping is path-shape specific (`webapp/.*`), and a generated repo's layout differs. A wrong mapping silently skips CI.

What ftn *did* prove is carried over: the install dominates the cost, so install/build/test run in **one job** rather than one per step — see `.buildkite/README.md` on ftn for the measurements.

### Deferred to v2

- **Deploy steps.** The generated CircleCI config deploys; this v1 only builds and tests. A v2 would port ftn's proven `export-cloudflare-env.sh` + `sync-doppler-secrets.sh` + `wrangler deploy` recipe for `cloudflare-wrangler` projects. This is the most material gap and the first thing to add.
- **Secret scanning**, path filtering, Lighthouse.
- **Pinned image digests** — v1 uses public tags (`node:22-bookworm`); the fleet owner can pin them per project.

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
