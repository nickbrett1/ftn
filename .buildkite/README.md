# Buildkite pipeline (Phase 1 port)

Port of ftn's CircleCI pipeline (`.circleci/config.yml` + `.circleci/config-main.yml`)
to Buildkite, running on the self-hosted `mac-studio-linux` agent, natively arm64.

**Phase 1 only: no deploys.** Parity validation (warm, gate-by-gate) is Phase 2.

Source brief: the `buildkite-phase1-ftn` memo. Master plan: `DFSsNwAc8NXcKSQsA2SJNb`.

## Layout

```
.buildkite/
  pipeline.yml            # bootstrap only — the port of CircleCI's dynamic config
  bootstrap.sh            # diff → decision → `pipeline upload` (path-filtering port)
  scripts/
    routing.sh            # the mapping table, ported verbatim (sourceable, testable)
    install-doppler-cli.sh
    setup/assert helpers  # wrangler.jsonc assertion, lockfile drift
    ggshield-scan.sh      # ggshield/scan orb equivalent
  steps/
    heavy.yml             # ggshield + Build + Code test (uploaded when non-trivial)
    lighthouse.yml        # main-only Lighthouse step (uploaded when the diff warrants)
    deploy.yml            # ported deploy steps — NOT uploaded during the pilot (D6)
  tests/test-routing.sh   # 28 cases over the mapping table
```

`.circleci/` is untouched — it stays until Phase 3 (cutover).

## Routing (the `path-filtering` port)

`bootstrap.sh` computes `merge-base(base-branch, BUILDKITE_COMMIT)` and diffs it,
then evaluates the mapping in `.buildkite/scripts/routing.sh` with the same
last-match-wins semantics as `circleci/path-filtering@3.0.0`:

* `run-build-test-deploy` **defaults to true** (the safety net); it is only false
  when the change set is docs/specs/markdown/CI-only.
* `run-lighthouse` is opt-in; when true **and** the build is on `main`, the
  Lighthouse step is uploaded in addition to the heavy set.

Prove it locally (no agent needed):

```
bash .buildkite/tests/test-routing.sh
```

## Agent configuration required (Mac Studio)

These live in `buildkite-agent.cfg` / the agent's `environment` hook, **not** in
this repo. Phase 0.5 proved the first two are hard requirements:

| Key | Value | Why |
|---|---|---|
| `plugins-path` | e.g. `/Users/nick/.buildkite-agent/plugins` | v4 has no usable default; omission hard-fails plugin checkout |
| `name` | `mac-studio-%spawn` | otherwise both workers share a name and race plugin checkout |
| `git-commit-verification` | `strict` | keep it; a job fails if the commit isn't on a branch — expected |
| `BUILDKITE_GIT_CLONE_FLAGS` | `--filter=blob:none --no-tags` | S3 — tunes the checkout *this file cannot reach* (bootstrap's own) |
| `BUILDKITE_GIT_FETCH_FLAGS` | `--filter=blob:none --no-tags` | as above |

`DOPPLER_TOKEN` (D10: dedicated, long-lived, account-wide) must be delivered to the
**job environment** by the agent `environment` hook. Container steps receive it
only through the docker plugin's **`environment:` list, name-only** — v4's
`BUILDKITE_ENV_FILE` omits hook vars, so `propagate-environment: true` forwards
nothing useful.

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
`BUILDKITE_REPO_MIRROR` is the next lever if a per-build full-ish checkout still
hurts. **Argument hygiene:** checkout tuning would help on *any* provider, so it is
not evidence for self-hosting.

### S11 — native cache vs volumes (verdict: volumes via npm's own cache)

`buildkite-agent cache save`/`restore` is driven by `BUILDKITE_AGENT_CACHE_STORE_URL`;
on a **self-hosted queue you supply the store**. There is no object store — standing
one up re-opens the MinIO question the plan closed (a stop-and-ask trigger). So we
use a docker named volume holding **`/root/.npm`** (npm's content-addressable cache).
It is *self-keying*: there is no checksum file to mis-manage and no "stuck key"
failure mode, which is the specific risk called out for hand-rolled node_modules
volumes. The measured upside of caching overall is only ~20% of the run, so this is
an optimisation, not a gate.

### Doppler CLI — install per-run (not Lane 2b)

The pinned image ships no Doppler CLI. Measured: the release artifact
(`doppler_*_linux_arm64.tar.gz`) is **~4.3 MB** (HTTP 200 from GitHub release
assets) and the installer script is ~19 KB — a few seconds per step. Lane 2b (own a
thin `FROM …playwright + curl` image) is therefore **not** justified for Phase 1. If
per-step install ever becomes flaky, build Lane 2b then — not speculatively.

### Caching / workspaces

* npm cache: named volume `ftn-npm-cache` (`/root/.npm`).
* Workspace: the artifacts API (build uploads `webapp/.svelte-kit/**`; the
  Lighthouse step downloads it via `artifacts#v1.9.4` **before** its command hook).
  **S2:** `.svelte-kit` is ~138 MB — if the round-trip is slow, switch to a docker
  volume shared with `build` and drop the plugin.
* Steps that touch shared volumes carry `concurrency_group: ftn/shared-volumes`
  with `concurrency: 1` so two builds cannot collide.

## Divergences from CircleCI (each deliberate)

| Divergence | Reason |
|---|---|
| `.buildkite/.*` added to the mapping as trivial | A Buildkite-only CI change is trivial in exactly the way `.circleci/.*` is. The rest of the table is byte-identical. |
| Lighthouse is a separate, conditionally-uploaded step, not a no-op job | Same outcome (Lighthouse runs iff the diff warrants, on main); CircleCI still paid for a job that did nothing when skipped. |
| Chromium via `CHROME_PATH` instead of `install-chrome` | S8 — the pinned image has no Google Chrome Stable and nothing on PATH. `.lighthouserc.cjs` already passes `--no-sandbox`. |
| `jq` installed in the Lighthouse step | The image has none and `webapp/scripts/run-lhci.sh` needs it. |
| No `npm install -g npm@11.19.x` | The pinned image already has npm 11.19.0. |
| No `@rollup/rollup-linux-x64-gnu` | Wrong arch — this is arm64; the build works without it. |
| `npm ci` in every job (not a restored node_modules cache) | Simpler and immune to a stale-cache class of bug; npm's own cache makes it cheap. |
| `code_test` does not attach the build workspace | It never consumed the build output (`lint` + `test-ci` only). Avoids the 138 MB round-trip. |
| Deploy steps ported but not uploaded | D6 — no deploys during the pilot. |

## Secrets

* **Never inline `NAME=value`** in a pipeline `environment:` — it leaks the value
  into the uploaded YAML *and* trips v4's `pipeline upload` secret scanner.
* **Names live in the pipeline; values never do.** Every container step forwards
  `DOPPLER_TOKEN` by name only.
* ggshield's key is read at runtime from Doppler's REST API using `DOPPLER_TOKEN`
  and passed to the container by env name (`--env GITGUARDIAN_API_KEY`), never on
  the command line.
* Log redaction is a **log-stream transform only** — it does not protect `dist/`
  or artifacts. See the leak gate below.
* **In a YAML `command:` block, shell references to hook vars must be `$$VAR`.**
  Buildkite interpolates `$VAR` in the pipeline YAML and an unknown var becomes
  *empty*, so `$$DOPPLER_TOKEN` is required for the shell to see it (proved the
  hard way in the D10 canary — three failed builds). This only affects `command:`
  blocks; the docker plugin's `environment:` name-only list is unaffected. The
  uploaded steps keep all shell work in `.buildkite/scripts/*.sh` for exactly
  this reason.

## Leak gate (run after the first green build)

Log redaction covers the job log; it does **not** cover build output. Check both:

```
# 1. job log — the Doppler token should appear only as [REDACTED]
#    (Buildkite MCP: tail_logs / search_logs for the value; or the web UI search)
# 2. build output
grep -rIl "$DOPPLER_TOKEN" webapp/.svelte-kit webapp/build webapp/dist 2>/dev/null
```

If it leaked: **revoke the token first** (D10 — revocation is the whole
mitigation), then fix, then mint a new one.

## Known risks to watch on the first real build

* **ggshield + blobless clone** — the range diff needs the base revision's blobs.
  `ggshield-scan.sh` materialises them on the *host* (where the agent's checkout
  credentials live) before the container runs. If in-container git cannot reach
  them, the fallback is `BUILDKITE_REPO_MIRROR`.
* **Playwright browser revision vs the pinned image** — if `webapp`'s `playwright`
  bump moves past chromium-1243, update the digest **and** `CHROME_PATH`.
* **`DOPPLER_PROJECT` missing fails silently** — hence `assert-wrangler-jsonc.sh`.

## Buildkite MCP

Read-only inspection (builds/jobs/logs/tests) is available to the agent via the
Buildkite MCP. Token scopes used: `read_pipelines`, `read_builds`, `read_build_logs`,
`read_job_env`, `read_artifacts`, `read_agents`.
