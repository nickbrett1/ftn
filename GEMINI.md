# ftn Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-08

## Active Technologies
- JavaScript (ES2022), Node.js 20+ + SvelteKit, Node.js crypto modules (001-genproj)
- Cloudflare D1 (for encrypted tokens), HTTP-only, secure, SameSite cookies (for client-side JWTs) (001-genproj)

- JavaScript (ES2022), SvelteKit 2.47, Node.js 20+ + SvelteKit, TailwindCSS, tippy.js, GitHub API, CircleCI API, SonarCloud API, Doppler API (001-genproj)

## Project Structure

```
src/
tests/
```

## Commands

npm test [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES]
Note: A development server is always running. Please ask the user to test changes directly instead of starting a new server.
**Important:** `npm run lint` should only be run when specifically requested by the user, not automatically after completing tasks.
**Important:** Never commit code unless explicitly told to.

## Code Style

JavaScript (ES2022), SvelteKit 2.47, Node.js 20+: Follow standard conventions

## Recent Changes
- 001-genproj: Added JavaScript (ES2022), Node.js 20+ + SvelteKit, Node.js crypto modules

- 001-genproj: Added JavaScript (ES2022), SvelteKit 2.47, Node.js 20+ + SvelteKit, TailwindCSS, tippy.js, GitHub API, CircleCI API, SonarCloud API, Doppler API

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

# Git Repository
- After each commit, there is no need to run `git status` to confirm it. Assume success unless an error is reported.