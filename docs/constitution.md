# Project Constitution

**Status:** Immutable source of truth for new-project constraints and principles
**Applies to:** Every new project scaffolded for or by this organization
**Version:** 1.0.0
**Last ratified:** 2026-07-07

---

## Preamble

This document defines the **non-negotiable** constraints, standards, and default technology choices for new projects. It exists so that any engineer or AI agent starting a new project inherits a consistent, high-quality, secure, and accessible foundation without re-deriving it from scratch.

The approved technology options below mirror the capability catalog of the `genproj` project-generation tool (`webapp/src/lib/config/capabilities.js`). When a new project needs a capability, it MUST use the approved option for that capability's category rather than introducing an unapproved alternative.

### The Conditionality Principle (read this first)

**These rules are conditional on need, not universal mandates.**

- A constraint applies **only if the project actually requires that class of technology.**
- If a project needs a **web frontend**, it MUST follow the Web Frontend rules. If it is a data pipeline, an iPad app, or a CLI with no web surface, those rules simply do not apply.
- If a project has **no secrets**, it does not need a secrets manager. If it has secrets, it MUST use the approved one.
- New technology classes not covered here (e.g. native mobile, embedded, ML training) are **permitted** — the constitution does not forbid them. It only governs the areas it explicitly covers, and asks that new patterns be documented (see [§7 Governance](#7-governance)).

Interpretation rule for agents: **absence of a need suspends the corresponding section; presence of a need makes that section binding.**

---

## 1. Core Architecture & Tech Stack

Each row is binding **only when the project needs that capability.**

| Capability (if needed) | Mandated choice | Notes |
| --- | --- | --- |
| Web frontend | **Svelte 5 / SvelteKit** | Runes-based Svelte 5. No alternative SPA framework. |
| Edge / serverless runtime | **Cloudflare** (Workers, Pages, KV, D1, R2, Durable Objects) | Deploy via Wrangler. Global edge is the default runtime target. |
| Alternate cloud (when edge is insufficient) | **Google Cloud** | Permitted for workloads that genuinely cannot run on the edge (e.g. long-running jobs). Justify in an ADR. |
| Secrets management | **Doppler** | Required whenever the project has any secret. No committed `.env` files. |
| CI/CD & automation | **CircleCI** | The single source of automated build, test, and deploy pipelines. |
| Data orchestration (if needed) | **Dagster** (Python) | Approved framework for data pipelines / software-defined assets. |
| Containerization | **Docker** + VS Code **DevContainers** | Node, Python, or Java DevContainer per the project's language. |

### 1.1 Web Frontend — Svelte / SvelteKit

- **Framework:** SvelteKit with Svelte 5 (runes).
- **Language:** JavaScript/TypeScript following SvelteKit conventions; avoid `any` without justification.
- **Rendering & routing:** Use SvelteKit's file-based routing and server endpoints; do not bolt on a competing router or SSR layer.

### 1.2 Edge Infrastructure — Cloudflare

- **Default target:** Cloudflare Workers / Pages for compute and hosting.
- **State & storage:** Prefer Cloudflare-native primitives — **KV** (edge config/cache), **D1** (relational), **R2** (object storage), **Durable Objects** (coordination).
- **Tooling:** Local development and deployment via **Wrangler**.
- **Escape hatch:** Workloads unsuited to the edge MAY use **Google Cloud**, documented in an ADR.

### 1.3 Secrets Management — Doppler

- All secrets and environment configuration flow through **Doppler**.
- Secrets are **never** committed to the repository and **never** logged or surfaced in error messages.
- Secrets are injected at runtime; there are no plaintext `.env` files in version control.

### 1.4 CI/CD & Automation — CircleCI

- **CircleCI** is the only sanctioned CI/CD system.
- The pipeline MUST run, at minimum: install → lint → format check → test (with coverage) → build → deploy.
- Quality gates ([§2](#2-engineering--code-quality-standards)) are enforced in the pipeline and block merge/deploy on failure.

---

## 2. Engineering & Code Quality Standards

These apply to **every** project regardless of type — all code is tested, linted, and formatted.

### 2.1 Automated Testing & Coverage

- An automated test suite is **mandatory**.
- **Minimum code coverage: greater than 80%.** Coverage is measured in CI and enforced as a hard gate; a drop below the threshold **blocks merge**.
- Test layers expected where applicable:
  - **Unit tests** — business logic, utilities, pure functions.
  - **Integration tests** — API endpoints, database access, external-service integrations.
  - **End-to-end tests** — user-facing flows, using **Playwright** (approved E2E tool) when the project has a UI.
- Tests MUST be **deterministic** (no flaky tests on the main branch) and **independent** (no ordering dependencies).

### 2.2 Code Hygiene — Linting & Formatting

- **Strict linting and formatting are enforced at both the pre-commit stage and in CI.**
  - **Linting:** ESLint (with the Svelte plugin for frontend projects).
  - **Formatting:** Prettier.
- Pre-commit hooks reject unformatted or lint-failing code locally; CI re-verifies so nothing bypasses the hook.
- Critical and high-severity lint warnings MUST be resolved before merge.

### 2.3 Static Analysis & Quality Gates (when configured)

- **SonarCloud** is the approved static-analysis platform; **SonarLint** provides the matching in-IDE feedback.
- When enabled, the SonarCloud **Quality Gate must pass** before merge, and auto-analysis is disabled in favor of CI-driven coverage upload.

### 2.4 Dependency & Supply-Chain Hygiene

- **Dependabot** keeps dependencies current and surfaces vulnerability alerts.
- **GitGuardian** scans for leaked secrets in the CI pipeline when secret-scanning is enabled.
- No known critical vulnerabilities may be merged to the main branch.

---

## 3. Frontend & Design Principles

Binding **only when the project has a web/UI surface.**

### 3.1 Accessibility (non-negotiable for UI)

- **WCAG 2.1 AA compliance** is required for all interactive elements.
- **Semantic HTML first**; use native elements before reaching for ARIA.
- **ARIA attributes** are added only where native semantics are insufficient.
- **Full keyboard navigation** is required; all interactive controls are reachable and operable without a pointer.
- **Screen-reader validation** is performed for critical flows.

### 3.2 UI Framework & Quality

- **Component-driven:** UI is composed of reusable, documented components — no ad-hoc, duplicated markup.
- **Clean & consistent:** styling uses shared design tokens (colors, spacing, typography); no inline styles or magic numbers.
- **Edge-performant:** the UI is optimized to run fast on Cloudflare's edge — code-split routes, optimized images, minimal client JS.
- **Responsive:** mobile-first, functional across small and large viewports.

### 3.3 Performance Monitoring (when configured)

- **Lighthouse CI** guards performance, accessibility, and SEO regressions.
- Projects SHOULD set and enforce a Lighthouse performance threshold in CI (recommended baseline: performance ≥ 90).

---

## 4. Development Environment & Tooling

Provided as **approved defaults** so every project shares a consistent developer experience. Use them when the corresponding need exists.

- **DevContainers:** Node.js, Python, or Java DevContainer (Docker-based) matching the project's primary language.
- **Editor configuration:** standardized VS Code extensions and settings (ESLint, Prettier, Svelte, GitLens, etc.).
- **Shell & terminal:** Zsh with Powerlevel10k, syntax highlighting, and autosuggestions.
- **Specification tooling:** **SpecKit** for spec-driven development.
- **AI coding agents:** Antigravity CLI, Cursor CLI, and Svelte MCP integration for context-aware assistance.

---

## 5. Applicability Matrix

Quick reference for which sections bind, by project type:

| Project type | Frontend rules (§3) | Cloudflare edge (§1.2) | Doppler (§1.3) | CircleCI + tests (§1.4, §2) |
| --- | --- | --- | --- | --- |
| Web app | ✅ Required | ✅ Required | ✅ If secrets | ✅ Required |
| Edge API (no UI) | ➖ N/A | ✅ Required | ✅ If secrets | ✅ Required |
| Data pipeline (Dagster) | ➖ N/A | ➖ Use GCP if needed | ✅ If secrets | ✅ Required |
| CLI / library | ➖ N/A | ➖ N/A | ✅ If secrets | ✅ Required |
| iPad / native mobile app | ➖ N/A (native UI a11y still expected) | ➖ N/A | ✅ If secrets | ✅ Required |

**Legend:** ✅ binding · ➖ not applicable for this type.

> Native/mobile projects are **not forbidden** — the web-specific rules simply do not apply, but the universal standards (testing, code hygiene, secrets-if-needed, CI/CD, accessibility of the native UI) still hold.

---

## 6. Decision Framework

When a technical decision is ambiguous, evaluate in this order:

1. **Security & secrets** — never expose or commit secrets. If a choice compromises this, reject it.
2. **Testability** — if it cannot be tested to the coverage bar, redesign it.
3. **Accessibility** — if it harms a11y on a UI surface, fix or reject it.
4. **Approved stack** — prefer the mandated option for the capability; deviations require an ADR.
5. **Edge performance** — prefer solutions that keep the app fast at the edge.
6. **Simplicity** — prefer the least complex option that meets the need.

---

## 7. Governance

- **Immutability:** This constitution is the authoritative baseline. Individual projects MUST NOT silently override it.
- **Exceptions & new patterns:** Any deviation, or any technology class not covered here, MUST be documented in an **Architecture Decision Record (ADR)** in the project's `docs/` directory, stating the need, the alternatives considered, and the tradeoff.
- **Absolutes:** Testing standards, code-hygiene enforcement, and secrets handling have **no exceptions** where the corresponding need exists.
- **Amendments:** Changes to this document follow semantic versioning:
  - **MAJOR** — removing or redefining a principle in a backward-incompatible way.
  - **MINOR** — adding a principle or approved option.
  - **PATCH** — clarifications and wording.

---

*This document is intended to be machine-parseable: each `##`/`###` header is a stable anchor an agent session can reference when checking a new project for compliance.*
