# Project Context for Cursor

## Project Overview

- This is a website, written by a single developer, that aims to showcase their personal projects and act as a way to learn new tools and technologies.

## Key Technologies

- The website uses:
  - SvelteKit
  - Cloudflare services such as Workers, D1 and R2.
  - vitest for testing
  - CircleCI for deployment
  - Lighthouse for browser performance testing
  - tsparticles for particle effects
  - vscode containers for development
  - vite for building
  - doppler for secrets management
  - sonarqube for additional code quality checks
  - Storybook in a limited capacity for UI component testing

## Directory Structure

- The main directories are:
  - `webapp/` for all the website code
  - `docs/` for design and requirement docs, targeted for LLMs
  - `webapp/src` for source code
  - `webapp/tests` for tests that are not associated with specific source files
  - `webapp/static` for static assets (not images as those are pre-processed)
  - `webapp/src/lib/components` for shared client-side components
  - `webapp/src/lib/icons` for icons
  - `webapp/src/lib/images` for images
  - `webapp/src/lib/server` for shared server-side code
  - `webapp/src/routes` for site routes

## Coding Conventions

- No specific conventions, conform to standard linting and formatting

## Special Instructions

- After creating the dev container, the `webapp/cloud-login.sh` needs to run to login to both doppler and Cloudflare services.

## Common Tasks

- Use `npm run dev` to run the dev server from webapp/ directory
- Use `npm run test` to run the tests from webapp/ directory
- Run `webapp/populate_local_d1_from_prod.sh` and `webapp/populate_local_r2_from_prod.sh` to copy production copies of data to read in the dev environment

## API Testing

- **Authentication Bypass for Development**: When testing API endpoints in development, use the `x-dev-test: true` header to bypass authentication
- **Example**: `curl -X GET http://localhost:5173/projects/ccbilling/cards -H "x-dev-test: true"`
- **Security**: This bypass only works when `NODE_ENV === 'development'` and the header is present
- **Production Safe**: Authentication is always enforced in production regardless of headers
- **Testing Pattern**: Use this header for all API testing to avoid creating temporary test endpoints

## Environment/Secrets

- All managed through doppler,

## Links

- Repository is here -> https://github.com/nickbrett1/ftn
- Site is here -> https://www.fintechnick.com

## New Feature: Real-time Collaboration

- See [docs/ccbilling.md](../docs/ccbilling.md) for full requirements and design.
- Summary: Adds a personal finance tool for reviewing credit card statements

---
