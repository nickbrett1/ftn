# Buildkite pipeline (Phase 1 port)

Port of ftn's CircleCI pipeline (`.circleci/config.yml` + `.circleci/config-main.yml`)
to Buildkite, running on the self-hosted `mac-studio-linux` agent, natively arm64.

**Phase 1 only: no deploys.** Parity validation (warm, gate-by-gate) is Phase 2.

Source brief: the `buildkite-phase1-ftn` memo. Master plan: `DFSsNwAc8NXcKSQsA2SJNb`.

## Layout

```
.buildkite/
  pipeline.yml            # the repo-side pipeline (bootstrap step)
  bootstrap.sh            # diff → decision → `pipeline upload` (path-filtering port)
  scripts/
    routing.sh            # the mapping table, ported verbatim (sourceable, testable)
    install-doppler-cli.sh
    assert-wrangler-jsonc.sh, lockfile-drift-check.sh
    ggshield-scan.sh      # ggshield/scan orb equivalent
  steps/
    heavy.yml             # ggshield + Build + Code test + Test results
    lighthouse.yml        # main-only Lighthouse step (uploaded only when warranted)
    deploy.yml            # ported deploy steps — NOT uploaded during the pilot (D6)
  tests/test-routing.sh   # 28 cases over the mapping table
```

`.circleci/` is untouched — it stays until Phase 3 (cutover).

## Wiring the pipeline object

Buildkite has no "commit the config and a pipeline appears" path: a Pipeline
object must exist before a push means anything. The one for this repo is
`nick-brett/ftn` (cluster `25e535fa-b23a-48bb-8588-1b1454fcfef8`, repo
`https://github.com/nickbrett1/ftn.git`).

Its own `configuration` is a single wrapper step that uploads the repo file, so
`.buildkite/pipeline.yml` stays the source of truth:

```yaml
steps:
  - label: ":pipeline: Upload repo pipeline"
    key: repo-pipeline
    agents: { queue: mac-studio-linux }
    command: "buildkite-agent pipeline upload .buildkite/pipeline.yml"
```

> **Why a wrapper and not an empty config:** creating the pipeline via the REST
> API requires a non-empty `configuration` (it rejects an omitted one), and an
> empty string makes Buildkite run the build with *zero steps* (`not_run`).
> The wrapper is also Buildkite's own default bootstrap shape.

**The GitHub webhook has to be registered explicitly.** A pipeline created through
the REST API gets a `provider.webhook_url` but no actual GitHub webhook, so pushes
produce **nothing** — even though the repository connection exists and
`build_branches`/`build_pull_requests` are true. Fix (undocumented, returns 201):

```bash
POST /v2/organizations/{org}/pipelines/{slug}/webhook   # with write scope
```

After that, builds arrive with `"source": "webhook"` rather than `"api"`.

## Agent configuration required (Mac Studio)

These live in `buildkite-agent.cfg` / the agent's `environment` hook, **not** in
this repo. Phase 0.5 proved the first two are hard requirements:

| Key | Value | Why |
|---|---|---|
| `plugins-path` | `/opt/homebrew/var/buildkite-agent/plugins` | v4 has no usable default; omission hard-fails plugin checkout |
| `name` | `mac-studio-%spawn` | otherwise both workers share a name and race plugin checkout |
| `git-commit-verification` | `strict` | keep it; a job fails if the commit isn't on a branch — expected |
| `BUILDKITE_GIT_CLONE_FLAGS` | `--filter=blob:none --no-tags` | S3 — tunes the checkout *this file cannot reach* (bootstrap's own) |
| `BUILDKITE_GIT_FETCH_FLAGS` | `--filter=blob:none --no-tags` | as above |

`DOPPLER_TOKEN` (D10: dedicated, long-lived, account-wide) must be delivered to the
**job environment** by the agent `environment` hook.

## Routing (the `path-filtering` port)

`bootstrap.sh` computes `merge-base(base-branch, BUILDKITE_COMMIT)` and diffs it,
then evaluates the mapping in `.buildkite/scripts/routing.sh` with the same
last-match-wins semantics as `circleci/path-filtering@3.0.0`:

* `run-build-test-deploy` **defaults to true** (the safety net); it is only false
  when the change set is docs/specs/markdown/CI-only.
* `run-lighthouse` is opt-in; when true **and** the build is on `main`, the
  Lighthouse step is uploaded in addition to the heavy set.

**A push to the base branch itself has an empty diff**, so it takes the safety
net (heavy) — that is deliberate, `main` is where the heavy set should run. The
ggshield step then scans the tip commit's own diff (`REV^..REV`) rather than an
empty range, which ggshield rejects.

Prove it locally (no agent needed):

```
bash .buildkite/tests/test-routing.sh
```

## Verified on the agent

* **Skip path** — a `.buildkite/`-only branch produced `run-build-test-deploy=false`
  and the build ran the bootstrap step only ("Trivial change set … skipping the
  heavy pipeline").
* **Heavy path** — a `webapp/` change ran the full set, all green (build #9):

  | Step | Result |
  |---|---|
  | `:pipeline: Upload repo pipeline` | passed |
  | `:mag: Bootstrap` | passed (routing → heavy) |
  | `:shield: ggshield secret scan` | passed |
  | `:hammer: Build` | passed (Doppler CLI, wrangler.jsonc, `npm ci`, drift check, `vite build`) |
  | `:test_tube: Code test` | passed (`npm ci`, `prettier`+`eslint`, `test-ci` with coverage) |
  | `:junit: Test results` | passed (annotation) |

Both Mac workers (`mac-studio-1`, `mac-studio-2`) took jobs in parallel.

## Decisions

### S3 — checkout cost (adopted: blobless)

Build #1 pulled 64,900 objects / ~415 MiB with no filter. Measured on this repo:

| | objects | size-pack | .git | clone time |
|---|---|---|---|---|
| full (`--no-checkout`) | 64,900 | 420.07 MiB | 421 M | 21 s |
| `--filter=blob:none` | 48,290 | 96.38 MiB | 113 M | 2 s |
| | | **−77%** | | **−90%** |

Set as pipeline `env` (covers every uploaded job) **and** on the agent (covers the
bootstrap's own checkout, which happens before `pipeline.yml` is read).
`BUILDKITE_REPO_MIRROR` is the next lever. **Argument hygiene:** checkout tuning
would help on *any* provider, so it is not evidence for self-hosting.

### S11 — native cache vs volumes (verdict: volumes via npm's own cache)

`buildkite-agent cache save`/`restore` is driven by `BUILDKITE_AGENT_CACHE_STORE_URL`;
on a **self-hosted queue you supply the store**. There is no object store — standing
one up re-opens the MinIO question the plan closed (a stop-and-ask trigger). So we
use a docker named volume holding **`/root/.npm`** (npm's content-addressable cache).
It is *self-keying*: no checksum file to mis-manage, no "stuck key" failure mode.
The measured upside of caching overall is only ~20% of the run, so this is an
optimisation, not a gate.

### Doppler CLI — install per-run (not Lane 2b)

The pinned image ships no Doppler CLI. Measured: the release artifact
(`doppler_*_linux_arm64.tar.gz`) is **~4.3 MB** (HTTP 200 from GitHub release
assets) and the installer script is ~19 KB — a few seconds per step. Lane 2b (own a
thin `FROM …playwright + curl` image) is therefore **not** justified for Phase 1.

### Workspaces and annotations

* Workspace: the artifacts API (build uploads `webapp/.svelte-kit/**`; the
  Lighthouse step downloads it via `artifacts#v1.9.4` **before** its command hook).
  **S2:** `.svelte-kit` is ~138 MB — if the round-trip is slow, switch to a docker
  volume shared with `build` and drop the plugin.
* `junit-annotate` is a **separate step** that depends on `code_test`: it reads the
  XML from the artifacts API, and in the producing step the upload has not
  happened yet. `allow_dependency_failure: true` so it annotates failures too.
* Steps that touch shared volumes carry `concurrency_group: ftn/shared-volumes`
  with `concurrency: 1` so two builds cannot collide.

## Secrets

* **Never inline `NAME=value`** in a pipeline `environment:` — it leaks the value
  into the uploaded YAML *and* trips v4's `pipeline upload` secret scanner.
* **A step-level `env:` value does not reach the container by itself.** Only entries
  in the docker plugin's `environment:` list do. So `DOPPLER_TOKEN`,
  `DOPPLER_PROJECT` and `DOPPLER_ENVIRONMENT` are all listed **name-only**:
  the value resolves from the job env at container start. (Learned in build #6:
  without `DOPPLER_PROJECT`, `doppler run` fails with "You must specify a project".)
* In a YAML `command:` block, shell references to hook vars must be `$$VAR` —
  Buildkite interpolates `$VAR` and an unknown var becomes *empty*. All uploaded
  steps keep their shell work in `.buildkite/scripts/*.sh` for this reason.
* The docker plugin runs every command in **one shell**, so `cd webapp && …` would
  persist; commands use subshells, `(cd webapp && …)`.
* ggshield's key is read at runtime from Doppler's REST API using `DOPPLER_TOKEN`
  and passed to the container by env name (`--env GITGUARDIAN_API_KEY`), never on
  the command line.
* Log redaction is a **log-stream transform only** — it does not protect `dist/`
  or artifacts. See the leak gate below.

## Leak gate — PASSED (build #9)

| Target | Method | Result |
|---|---|---|
| Job logs (bootstrap, ggshield, build, code_test) | searched for `RbImgu`, `dp.pt.`, `dp.st.`, `DOPPLER_TOKEN` | no token value. Only `--env DOPPLER_TOKEN` (name), the hook's `# DOPPLER_TOKEN added` line, the script's own length message, and the Doppler CLI's own masked preview `dp.pt…RbImgu` |
| Client JS bundles (91 files, 2.5 MB) | downloaded from artifacts, grepped | 0 hits |
| Client sourcemaps (87 files) | streamed + grepped | 0 hits |

Default Vite posture keeps non-`VITE_` vars out of client code; verified rather
than assumed. If a leak is ever found: **revoke the token first** (D10 —
revocation is the whole mitigation), then fix, then mint a new one.

## Divergences from CircleCI (each deliberate)

| Divergence | Reason |
|---|---|
| `.buildkite/.*` added to the mapping as trivial | A Buildkite-only CI change is trivial in exactly the way `.circleci/.*` is. The rest of the table is byte-identical. |
| Lighthouse is a separate, conditionally-uploaded step, not a no-op job | Same outcome; CircleCI still paid for a job that did nothing when skipped. |
| Chromium via `CHROME_PATH` instead of `install-chrome` | S8 — the pinned image has no Google Chrome Stable and nothing on PATH. `.lighthouserc.cjs` already passes `--no-sandbox`. |
| `jq` installed in the Lighthouse step | The image has none and `webapp/scripts/run-lhci.sh` needs it. |
| ggshield runs on the agent host against the official image | Same image as CircleCI's orb; the host is where the checkout credentials live, so a blobless clone can materialise the base revision for the range diff. |
| No `npm install -g npm@11.19.x` | The pinned image already has npm 11.19.0. |
| No `@rollup/rollup-linux-x64-gnu` | Wrong arch — this is arm64; the build works without it. |
| `npm ci` in every job (not a restored node_modules cache) | Simpler and immune to a stale-cache class of bug; npm's own cache makes it cheap. |
| `code_test` does not attach the build workspace | It never consumed the build output (`lint` + `test-ci` only). Avoids the 138 MB round-trip. |
| Deploy steps ported but not uploaded | D6 — no deploys during the pilot. |

## Cutover

`.circleci/` was **removed** once CircleCI was unfollowed from the project and
stopped receiving pushes — this is the only CI now. The CircleCI path-filtering
mapping lives on inside `.buildkite/scripts/routing.sh` (with `circleci/...`'s
last-match-wins semantics preserved and 28 tests over it), which is why the
mapping still names `.circleci/.*` as a trivial path: it is the ported rule set,
not a reference to a config file that still exists.

Note that the `circleci` **capability** in genproj is a different thing — it
generates `.circleci/config.yml` for *generated* projects, and is unaffected.

## Open items

* **S5 — push-triggered builds: resolved.** See the webhook registration above. A
  push now creates a build (`source: webhook`) with no manual trigger.
* **Branches that predate this port fail** at the wrapper step: there is no
  `.buildkite/pipeline.yml` to upload until `.buildkite/` lands on `main`. That is
  the one thing still blocking the brief's exit criteria (`dependabot/**` and
  `main` builds).
* **Lighthouse (S8)** has not been exercised end-to-end — it needs a landing-page
  change on `main`. Watch `CHROME_PATH` against the pinned image.
* **Pin maintenance:** if `webapp`'s `playwright` moves past chromium-1243, update
  the image digest **and** `CHROME_PATH`.
