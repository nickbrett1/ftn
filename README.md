# Fintech Nick — Developer Portfolio & Playground

_A modern, server-side rendered web app that showcases my work in financial technology, data engineering and interactive front-end development._

**Live site → https://www.fintechnick.com**

---

## What you’ll find here

1. **Interactive Projects & Articles**
   • **Credit-Card Billing Assistant (`/projects/ccbilling`)** – a personal-finance tool that parses PDF statements with Meta Llama 3, stores data in Cloudflare D1/R2 and lets me reconcile charges against budgets with a slick Svelte UI.
   • **Modern ETL without a Warehouse (`/projects/dbt-duckdb`)** – long-form article (with inline charts) on building pipelines with _dbt_ + _DuckDB_.
   • **3-D Playground (`/projects/3d`)** – WebGL scenes powered by Three.js/Threlte and GSAP.

2. **Component Library**  
   Storybook lives under `.storybook/` and is deployed automatically on every commit.

3. **Documentation & Schemas**  
   Design notes live in `docs/` (e.g. `docs/ccbilling.md`), while Cloudflare D1 schemas sit beside the code (`webapp/ccbilling_schema.sql`).

---

## Tech Stack (selection)

| Area | Tech |
| --- | --- |
| Front-end | SvelteKit 5 • TypeScript • TailwindCSS • Threlte / Three.js • ApexCharts |
| Back-end | Cloudflare Workers & Pages • Cloudflare D1 (SQLite) • Cloudflare R2 |
| Data | dbt-core • DuckDB |
| AI | Meta Llama 3 via API for PDF → JSON parsing |
| Tooling | Vitest • Playwright • Storybook • ESLint + Prettier • SonarCloud • Lighthouse CI |
| CI/CD | CircleCI (workflows in `.circleci/`) → Preview & Production deploys via Wrangler |

---

## Quick Start (local)

```bash
# 1. Clone & install
npm install --prefix webapp

# 2. Run dev server (uses Vite + SvelteKit)
npm run --prefix webapp dev

# 3. Open http://localhost:5173
```

> ⚠️ Some routes require Cloudflare credentials or env-vars (see `doppler.yaml`). For a quick look you can browse the public pages without any secrets.

---

## Repository Layout

```
├── webapp/          # SvelteKit source
│   ├── src/         # Components, routes, lib code
│   ├── static/      # Static assets
│   ├── tests/       # Unit & integration tests
│   └── .storybook/  # Component explorer
├── docs/            # Design & feature specs
├── .circleci/       # CI pipeline (build → test → lighthouse → deploy)
└── README.md
```

---

## Why this project exists

I use **Fintech Nick** as a sandbox to explore ideas I encounter as a fintech engineering lead – from cloud-native data stacks to UX micro-interactions. The code is intentionally public so that hiring managers, collaborators and curious engineers can see how I think, write and test software.

Enjoy the tour!

— Nick
