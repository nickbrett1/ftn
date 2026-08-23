# Branch Gating — Planning Memo (DRAFT for review)

**Date:** 2026-08-23
**Status:** Draft — for review before implementation
**Owner:** developer (review) / goose (implementation)
**Goal:** Cut CircleCI credit spend by running the **full heavyweight pipeline only on `main`** (and on PRs that genuinely touch the frontend), running a lighter suite on other branches, and — critically — **baking this into genproj** so every *new* project gets it by default.

This builds on the P0 changes already shipped in `ftn` (see `docs/circleci-cost-reduction.md`) and directly addresses the conclusion that P0 alone leaves the org ~6× over the free-tier ceiling.

---

## 1. The recommended branch-gating pattern (the standard)

For every webapp project, apply this default CI shape:

```text
ggshield/scan              → runs on everything (cheap, keep)
build                      → runs on everything / or path-filtered to src+lockfiles
├─ code_test               → runs on all branches (fast, medium class)
├─ browser_test (Lighthouse)→ main ONLY (or main + frontend-changing PRs)
└─ deploy / deploy-preview → main / main-with-preview only
```

Concretely:
- **`browser_test` (Lighthouse)** and **preview deploys**: run on **`main` only**, not every PR/branch. Optionally, allow on PRs whose diff touches `webapp/**` (path filtering).
- **`code_test`**: keep on all branches (it's the valuable signal) but at **`medium`** class (already done in ftn).
- **Deploy to prod**: `main` only (unchanged).
- **Dependabot `dependabot/**` branches**: skip heavy jobs entirely (Lighthouse + preview), only run `build` + fast checks.
- **Non-webapp changes** (`docs/**, specs/**, *.md, .circleci/**`): skip the whole heavy pipeline via path filtering.

Net effect: branch work pays for `build` + fast tests; only `main` merges pay for Lighthouse and deploy. This targets the ~55% of runs in ftn that are non-main merges.

---

## 2. Per-project assessment (which projects are worthwhile)

Credit data = trailing 30 days (Insights). "Branch behavior" = from each repo's `.circleci/config.yml` on `origin/main`.

| Project | Credits/mo | Runs/mo | ~credits/run | Branch behavior today | Branch-gating value |
|---|---|---|---|---|---|
| **ftn** | 174,139 | 1,074 | ~162 | Full suite + Lighthouse + preview on every branch | **PRIMARY** (~45k potential) |
| **agent-swarm** | 19,898 | 630 | ~32 | `build` + **preview deploy on every non-main branch** (630 runs!) | **HIGH** — biggest run volume; preview deploy on every branch |
| **dbt-duckdb** | 14,029 | 170 | ~83 | **No branch filters at all** — heavy data download/transform jobs on every branch push | **HIGH** — should be gated to `main`/schedule |
| **stripe-toddler** | 7,658 | 133 | ~58 | `build` + **preview deploy on every non-main branch** | **MEDIUM-HIGH** |
| **pshelf** | 11,723 | 66 | ~178 | `build` on all branches; **`docker-publish` already `main`-only** | **LOW** — expensive part already gated; cost is in main docker builds |
| **mailroom** | 16,590 | 107 | ~155 | `build` on all branches; `docker-publish` (3 images) `main`-only | **LOW** — same as pshelf |
| **nas-port-mcp** | 1,176 | 39 | ~30 | `build` on all branches; `docker-publish` `main`-only | **LOW** — low volume |
| **parquet-peek** | 545 | 10 | ~55 | `build` on all branches; `docker-publish` `main`-only | **LOW** — negligible volume |

**Verdict:**
- **Worthwhile for branch gating:** `ftn` (primary), `agent-swarm`, `stripe-toddler`, `dbt-duckdb`.
- **Not the right lever (branch gating adds little):** `pshelf`, `mailroom`, `nas-port-mcp`, `parquet-peek` — their expensive `docker-publish`/deploy is *already* `main`-only, so the branch runs are just the (cheap-ish) `build` job. Their real cost is **main-only docker/image builds** (esp. `pshelf` at ~178/run and `mailroom` building 3 images), which is a *different* optimisation (Docker layer caching, multi-arch trade-offs, build frequency) — out of scope for this memo but flagged for follow-up.

---

## 3. Plan per project

### 3.1 ftn (primary)
Already has P0 (dependabot + path filtering + medium test class). Add branch gating:
- `browser_test` (Lighthouse): run on **`main` only**, and only when the diff touches **landing-page files** (`landing-paths`). Lighthouse already audits only the root landing page, so subpage-only changes (e.g. `webapp/src/routes/projects/...`) skip it entirely.
  - `landing-paths` ≈ `webapp/src/routes/+page.svelte`, `+layout.svelte`, `+error.svelte`, `webapp/src/lib/components/{About,Contact,Experience,Footer,Header,Landing,Navbar,Projects}.svelte`, `webapp/src/app.css`, `webapp/static/**`, `webapp/src/lib/icons/**`, `webapp/src/lib/images/**`, `webapp/package*.json`.
  - Caveat: root `+layout.svelte` + `Footer/Header/Navbar` are shared across all pages, so a subpage change that also touches those still triggers Lighthouse (correct — the layout is part of the landing page).
- `deploy-preview`: gate to webapp-path changes (already path-filtered) and confirm it's not needed on docs-only branches.

### 3.2 agent-swarm
- **Remove** the `deploy-to-cloudflare-preview` job entirely (currently `branches: ignore: main`, runs on every non-main branch). Decision: previews are not used for QA, and production deploys already happen on `main`. Removing it eliminates the build+preview cost on every branch push.
- Keep the production `deploy-to-cloudflare` (main-only).
- 630 runs/mo makes this the highest-volume win after ftn.

### 3.3 stripe-toddler
- Same as agent-swarm: **remove** the `deploy-to-cloudflare-preview` job entirely; keep the main-only production deploy.

### 3.4 dbt-duckdb
- The `download_transform_load` workflow has **no branch filters** — it runs the expensive download/transform/export/R2 jobs on *every* push. Gate to **`main` only** (or convert to a scheduled workflow), so PR/branch pushes stop triggering full data runs.

### 3.5 pshelf / mailroom / nas-port-mcp / parquet-peek
- **No branch-gating work recommended now.** Flag docker-build cost as a separate follow-up. (They already benefit from cheap branch `build` runs; a lightweight `dependabot/**` skip on the deploy job is the only cheap add if desired.)

---

## 4. genproj enhancement — new projects get branch gating by default

This is the highest-leverage piece: **genproj currently bakes in the wasteful pattern**. The CircleCI template (`webapp/src/lib/templates/circleci-config.template`) and its generator (`webapp/src/lib/utils/capability-template-utils.js`) emit:
- `lighthouse` running on **all branches** (no filter) — expensive, and useless on most PRs.
- `deploy-to-cloudflare-preview` on **every non-main branch**.
- `build` on all branches with **no path filtering**, **no dependabot skip**.

**Proposed genproj changes (defaults, opt-out available):**
1. **`lighthouse` → `main` only** (add `filters: branches: only: main`), and only when the `lighthouse-ci` capability is selected.
2. **Preview deploy → `main` only**, not every branch (or add a "preview on every branch" capability toggle, defaulting OFF).
3. **Dependabot skip** — add `branches: ignore: dependabot/**` to lighthouse + preview deploy jobs.
4. **Path filtering** — for generated projects with a frontend/webapp, emit the `webapp-paths` path filter so docs/spec/CI-only changes skip the heavy pipeline (mirror the ftn anchor).
5. **New capability**: expose an option like `ci.branchGating: true` (default) that controls 1–4, so power users can opt into the old "full pipeline everywhere" behaviour when they want it.

These go into `capability-template-utils.js` (workflow placeholder generation, ~lines 289–511) + the `circleci-config.template`, with matching test updates in `webapp/tests/lib/server/circleci-generation.test.js`.

---

## 5. Implementation plan / phasing

| Phase | Scope | Notes |
|---|---|---|
| **P1-A** | `ftn` branch gating (config-only) | Smallest, unblocks measurement |
| **P1-B** | `agent-swarm`, `stripe-toddler` | Gate preview deploys off branches + dependabot skip |
| **P1-C** | `dbt-duckdb` | Gate workflow to `main`/schedule |
| **P1-D** | **genproj template + generator** | Make branch gating the default for new projects (highest leverage) |
| **P1-E** | Re-measure org credits | After ~2 weeks, validate reduction before considering more |
| **Follow-up** | Docker-build cost in pshelf/mailroom | Separate from branch gating |

---

## 6. Risks & caveats

- **Lighthouse only on `main`** = less PR-level performance signal. Mitigation: keep the option to run on `webapp/**`-touching PRs; rely on `main`-post-merge for the canonical Lighthouse gate.
- **`dbt-duckdb` gating** may hide data-pipeline failures on branches; ensure a scheduled cadence or manual trigger covers it.
- **Path filtering edge case**: first pushes to brand-new branches can still trigger a full run (base-revision behaviour) — one-time, not recurring.
- **agent-swarm/stripe-toddler preview**: if preview URLs are actively used for manual QA on PRs, gate preview deploy to `webapp/**`-changing PRs rather than dropping it entirely.
- **genproj change** alters generated output → update golden-file/template tests and any snapshot tests before merging.

---

## 7. Open questions for review

1. ~~Any PR-level Lighthouse?~~ **Resolved:** Lighthouse runs on `main` only, and only when the diff touches landing-page files (`landing-paths`); subpage-only changes skip it (see §3.1).
2. ~~Are `agent-swarm` / `stripe-toddler` preview deploys used for manual PR QA?~~ **Resolved:** not used at all — remove the preview deploy job entirely for both (see §3.2/3.3).
3. ~~For `dbt-duckdb`: gate to `main` only, or add a scheduled run?~~ **Resolved:** gate to `main` only (Option A).
4. ~~Should the genproj `lighthouse-ci` capability default to `main`-only, or keep a preview toggle?~~ **Resolved:** genproj `lighthouse-ci` defaults to **`main`-only** (with a landing-page path filter where a frontend exists).
5. Approve phasing order (P1-A → P1-B → P1-C → P1-D)?

---

## 8. Summary

Branch gating is the biggest single lever left (ftn ~45k/mo potential), and it's best applied as a **default everywhere**, which is exactly what the genproj enhancement achieves — so new projects never start with the expensive pattern. The clear targets are **ftn, agent-swarm, stripe-toddler, dbt-duckdb**; the remaining four projects need a different (docker-cost) treatment.
