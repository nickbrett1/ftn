# CircleCI Cost Reduction Memo

**Date:** 2026-08-23
**Author:** goose (on behalf of developer)
**Status:** Proposal for review
**Goal:** Reduce CircleCI credit spend so the org can drop the Performance plan and return to the Free plan.

---

## 1. Executive summary

The `ftn` project is by far the biggest CircleCI credit consumer in the org, burning **~174k of the org's ~246k credits** in the trailing 30 days (~71%). Our CI is fast but **credits-hungry**, and crucially we run the *entire* expensive pipeline on **every push to every branch**, including on **Dependabot bumps** and **genproj feature work** that is internal to this repo. The user's hypothesis is essentially correct: genproj changes live inside `ftn` and trigger the full build + test + Lighthouse pipeline every time.

The core problem is not any single job — it is **run volume × per-run cost**. Each `ftn` pipeline run costs roughly **160 credits**, and most runs are caused by work that does not need the full expensive suite.

**Bottom line:** we will not realistically get under the free-plan ceiling (~30k credits/mo) purely by micro-optimising one job. We need to (a) cut the number of full runs, (b) stop spending credits on dependabot, and (c) make Lighthouse/`large`-class jobs conditional rather than unconditional. Extracting genproj into its own project is a sound medium-term step and directly removes a large class of expensive runs.

---

## 2. Current cost baseline (trailing 30 days)

| Project | Credits | Runs | Avg credits/run |
|---|---|---|---|
| **ftn** | **174,139** | **1,074** | **~162** |
| agent-swarm | 19,898 | 630 | ~32 |
| mailroom | 16,590 | 107 | ~155 |
| dbt-duckdb | 14,029 | 170 | ~83 |
| pshelf | 11,723 | 66 | ~178 |
| stripe-toddler | 7,658 | 133 | ~58 |
| nas-port-mcp | 1,176 | 39 | ~30 |
| parquet-peek | 545 | 10 | ~55 |
| **Org total** | **245,758** | **2,229** | ~110 |

`ftn` uses a single workflow, `build_test_deploy`, responsible for **103,985 credits over 650 completed runs** (~160 credits/run).

**Free-plan target:** CircleCI's free tier provides roughly 30,000 credits/month. Reaching it from 246k requires cutting spend by **~88%** — this will not happen by tuning one job; it requires structural reduction in run volume and per-run cost.

---

## 3. Root-cause analysis — why `ftn` is so expensive

### 3.1 Every push runs the full heavyweight pipeline
The workflow (`.circleci/config.yml`) is:

```
ggshield/scan
  → build                (npm ci + Playwright Chromium install + full vite build w/ mermaid rendering)
     → code_test         (resource_class: large, full vitest suite w/ ≥80% coverage + lint)
     → browser_test      (Chrome + Lighthouse CI against staging)
        → deploy (main) / deploy-preview (all other branches)
```

Every branch push therefore runs **build + code_test(large) + browser_test(Lighthouse) + a preview deploy**. That's a lot of paid compute for what is often a docs or spec change.

### 3.2 Dependabot is a silent, large cost
Of the **20 most recent `ftn` runs, 8 (40%) were Dependabot branches or their merge-to-`main` commits**. Each Dependabot bump — a transitive dependency version change — runs the *full* pipeline, including Lighthouse against staging and a preview deploy. Extrapolated to the month, that is roughly **~430 runs ≈ ~70k credits** spent purely on dependency bumps.

### 3.3 genproj work lives in this repo and triggers full runs
genproj is ~4,300 lines embedded in `webapp/` (routes, lib components, server auth, etc.). Any genproj change is a frontend/webapp change, so it rebuilds the whole webapp, runs the full test suite, and runs Lighthouse against staging. Of the last 20 runs, **5 (25%) were genproj work** (~43k credits/mo extrapolated). Combined, **dependabot + genproj ≈ 65% of ftn's runs.**

### 3.4 Unconditional Lighthouse against staging
`browser_test` runs Lighthouse on every branch push. This is a Chrome-heavy, memory/CPU-intensive job. Note that `.lighthouserc.cjs` already disables a large number of audit assertions (`unused-javascript`, `color-contrast`, several performance-insights rules, etc.), which suggests the *value* of running it on every PR is low — yet it still pays for the full Lighthouse run each time.

### 3.5 `code_test` uses `resource_class: large`
`large` costs **2× credits per minute** vs the default `medium`. Combined with a full `npm ci` + lint + complete test suite with coverage, this is one of the most expensive jobs and it runs on every branch push.

### 3.6 Preview deployments for every branch
`deploy-preview` runs on every branch except `main`, even when the change doesn't touch the deployed app (e.g. specs, docs, CI config itself).

---

## 4. Proposed changes (priority order)

### P0 — Quick wins (days, minimal risk)

**1. Don't run the full pipeline on Dependabot.**
- Skip `browser_test` (Lighthouse) and `deploy-preview` for `dependabot/**` branches.
- Optionally group Dependabot PRs / auto-merge so fewer merges hit `main`.
- *Expected:* removes ~40% of runs (~70k credits/mo). **Biggest single lever.**

**2. Make `browser_test` (Lighthouse) conditional.**
- Run Lighthouse only on `main` (post-merge), or only when the diff touches frontend paths (`webapp/src/**`, `webapp/static/**`, `webapp/package*.json`), using CircleCI path filtering.
- *Expected:* removes most of the ~25–40% of Lighthouse runs that are on PRs/branches.

**3. Downsize `code_test` from `large` → `medium`.**
- Halves that job's credit burn. If tests need more memory, keep `NODE_OPTIONS=--max-old-space-size` as-is and only promote to `large` for the `main`/nightly run.
- *Expected:* meaningfully cheaper per run (the largest per-job cost after Lighthouse).

**4. Add path-based filtering so non-webapp changes skip heavy jobs.**
- Use `paths:` filters so changes to `docs/**`, `specs/**`, `*.md`, and `.circleci/**` do **not** trigger `build`/`code_test`/`browser_test`/deploy. Only `webapp/**` and lockfiles should.
- *Expected:* removes all runs caused by documentation/spec/CI-only commits.

**5. Make `deploy-preview` conditional on frontend changes.**
- Only deploy a preview when `webapp/**` actually changed (same path filter as #4).

### P1 — Structural (weeks)

**6. Extract genproj into its own repository/project.**
- genproj is a self-contained capability (~4,300 lines). Moving it to a dedicated repo with its own (lighter) CircleCI project means genproj work no longer pays for ftn's full webapp build + Lighthouse + preview deploys.
- This directly validates the user's hypothesis and is the cleanest way to stop genproj from "riding" the expensive ftn pipeline.
- *Note:* this is a bigger change (repo split, auth/config sharing, cross-repo integration), so sequence it behind the P0 wins.

**7. Reduce redundancy between `build` and the deploy/preview jobs.**
- `build` installs Playwright Chromium and renders mermaid SVGs at build time — ensure the Playwright and node_modules caches are actually being hit across branches (cache keys currently include branch, which limits cross-branch reuse; consider a shared `main`-flavoured cache key fallback).

**8. Consider gating to branch filters.**
- Run the full `build + code_test + browser_test` only on `main` and on `webapp/**` PRs; run a lighter `build + lint` on other branches. This caps per-run cost for non-critical work.

---

## 5. Realistic path back to the Free plan

Achieving ~30k credits/mo from ~246k is an ~88% cut. Even executing all of P0/P1, staying comfortably under 30k is aggressive; realistically we may land in the tens-of-thousands range. Recommended sequencing:

1. **Land P0 items 1–4 first** — they're low-risk and should cut the majority of spend (dependabot + path-filtered runs + smaller test class + conditional Lighthouse). Re-measure after a week.
2. **Land P1 item 6 (genproj extraction)** — removes the second-largest source of expensive runs at the source.
3. **Re-evaluate** against the free-plan ceiling. If still over, apply P1 items 7–8 and revisit concurrency (free plan also limits concurrency, so lower concurrency may be a natural fit).

**Suggested next step:** implement P0 items 1, 2, and 4 together in `.circleci/config.yml` (dependabot filtering + path-based filtering + conditional Lighthouse), then re-run the cost query after ~1 week to measure the actual reduction before doing the larger genproj extraction.

---

## 6. Status / implemented changes (2026-08-23)

**Important correction:** CircleCI does **not** support a native `paths:` filter on workflow jobs (earlier versions of this memo and an early implementation assumed it did). This caused a config-validation error that broke builds (fixed in `5f9194bb`). Path-based skipping is instead implemented with the **CircleCI path-filtering orb + dynamic config** (`a69e700a`) — see §8.

What is actually in place (all in `.circleci/`):

- **`code_test`:** on default `medium` (was `large`) — halves that job's credit burn.
- **Lighthouse (`browser_test`):** runs on `main` only, and only when the diff touches landing-page files (path-filtering orb sets `run-lighthouse`).
- **`deploy`:** `main` only; **`deploy-preview`:** not `main` and not `dependabot/**`.
- **Dependabot / trivial changes:** `dependabot/**` skips preview; docs/specs/markdown/`.circleci`-only changes skip the whole pipeline via the orb (`run-build-test-deploy`).
- **`ggshield/scan`:** security scan still runs within the main workflow (skipped only when the whole pipeline is skipped for trivial changes).

**Next step:** verify the path-filtering setup on the next webapp-touching commit (this bootstrap commit does not run the pipeline), then let ~1 week of runs accumulate before re-measuring.

---

## 7. Projected impact of P0 (based on last month's activity)

Estimated by classifying the 20 most recent ftn runs and applying the P0 behavior changes. Per-job credit splits are estimates (the Insights API exposes workflow-level, not job-level, credits), so the Lighthouse share is ranged 30–40%.

**Run mix in the sample (ftn):**

| Run type | Share | P0 effect |
|---|---|---|
| Dependabot branch | 40% | skips Lighthouse only (still builds/tests — lockfiles change) |
| Dependabot merge → main | 35% | **no change** (runs full pipeline on `main`) |
| genproj | 20% | **no change** (webapp change, path-filter passes; only extraction helps) |
| Other main | 5% | — |

~55% of runs (dependabot merges + genproj) are **not** helped by P0.

**Projected monthly ftn spend (repeating last month):**

| Item | Credits/mo |
|---|---|
| Baseline ftn | 174,139 |
| − `code_test` large→medium | −24,379 |
| − Dependabot-branch Lighthouse | −20,897 to −27,862 |
| − Path filtering (est. ~5% docs/CI-only) | −8,707 |
| **Projected ftn** | **~113k–120k** |
| **Reduction** | **~31–35%** |

**Comparison vs target:**

| | Credits/mo |
|---|---|
| Last month (actual) | 245,758 |
| Projected ftn after P0 | ~113–120k |
| Projected **org** after P0 (ftn + ~71k other projects unchanged) | ~185–192k |
| **Free tier target** | ~30k |

**Bottom line:** P0 delivers a solid ~31–35% cut for ftn but leaves the org ~6× over the free-tier ceiling (~30k/mo). Reaching free tier requires additional, combination work:
1. genproj extraction (removes ~20% of ftn runs).
2. Apply the same treatment to other heavy projects — `mailroom` (~155 credits/run) and `pshelf` (~178 credits/run) are as expensive per run as ftn; their ~71k total alone exceeds free tier.
3. Branch-level gating (full suite only on `main`; lighter `build + lint` on branches).
4. Reduce deploy runs / concurrency (free tier also caps concurrency, a natural fit).

## 8. Path filtering via the CircleCI orb (implemented `a69e700a`)

CircleCI has no native `paths:` workflow filter, so path-based skipping is done with **dynamic configuration**:

- **`.circleci/config.yml`** — `setup: true`, runs the `circleci/path-filtering` orb job `path-filtering/filter`. It diffs the changed files and injects pipeline parameters into the main config.
- **`.circleci/config-main.yml`** — the real pipeline, gated by two boolean parameters:
  - `run-build-test-deploy` (default **true** — safety net): set **false** for `docs/**, specs/**, *.md, .circleci/**`-only changes so the whole heavy pipeline is skipped.
  - `run-lighthouse` (default **false**): set **true** only for landing-page file changes (root routes, landing components, `app.css`, `static/icons/images`, `package*.json`), so Lighthouse runs on `main` for landing changes only.
- The `webapp/.* → true` mapping lines are ordered **after** the trivial `false` lines so a commit touching both webapp code and docs still runs the pipeline (last matching line wins).

**Caveats:** the commit that introduced this touches only `.circleci/**`, so it is expected not to run the pipeline (bootstrap) — verification happens on the next webapp-touching commit. If the setup misbehaves, revert to `5f9194bb` (last known-good single config).

## Appendix — reference data
- `.circleci/config.yml`: single `build_test_deploy` workflow; `code_test` uses `resource_class: large`; `browser_test` runs Lighthouse against staging (`LIGHTHOUSE_ENABLED=true`, `npm run lighthouse-staging`); `deploy-preview` runs on all non-`main` branches.
- `webapp/.lighthouserc.cjs`: Lighthouse CI runs 1 collect, uploads to temporary public storage, disables many assertions.
- genproj scope: `webapp/src/routes/projects/genproj/**`, `webapp/src/lib/components/genproj/**`, `webapp/src/lib/server/genproj-*.js`, `webapp/src/lib/utils/genproj-*.js` (~4,300 LOC).
