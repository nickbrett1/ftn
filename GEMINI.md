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

[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES]
Note: A development server is always running. Please ask the user to test changes directly instead of starting a new server.
**Important:** `npm run lint` should only be run when specifically requested by the user, not automatically after completing tasks.
**Important:** Never commit code unless explicitly told to.

## Code Style

JavaScript (ES2022), SvelteKit 2.47, Node.js 20+: Follow standard conventions

## Recent Changes

- 001-genproj: Added JavaScript (ES2022), Node.js 20+ + SvelteKit, Node.js crypto modules

- 001-genproj: Added JavaScript (ES2022), SvelteKit 2.47, Node.js 20+ + SvelteKit, TailwindCSS, tippy.js, GitHub API, CircleCI API, SonarCloud API, Doppler API

<!-- MANUAL ADDITIONS START -->

**Important:** Run `npm run test:once` to run tests

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

<!-- MANUAL ADDITIONS END -->

# Git Repository

- After each commit, there is no need to run `git status` to confirm it. Assume success unless an error is reported.
