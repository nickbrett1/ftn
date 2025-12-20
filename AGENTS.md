# Agent Information and Known Issues

This document provides information for AI agents working on this codebase.

## Project Structure and Workflow

- **Root Directory**: The root of the repository contains project-wide configuration.
- **Web Application**: The main application code and `package.json` are located in the `webapp` subdirectory.

### Setup and Testing

When working on the application, you must run commands from within the `webapp` directory.

1.  **Install Dependencies**: Before running any tests or scripts, ensure dependencies are installed.
    ```bash
    cd webapp && npm install
    ```

2.  **Run Tests**: To run the test suite once (without watch mode):
    ```bash
    cd webapp && npm run test:once
    ```

## Jules Tools

The `.jules` directory contains tools specifically designed for the Jules AI agent to verify changes and perform utility tasks.

- **`verify_ui.py`**: A Playwright script used to verify the `genproj` UI. It navigates to the project generation page, takes a screenshot, and performs assertions (e.g., ensuring certain elements are hidden).
    - **Usage**: `python3 .jules/verify_ui.py`
    - **Prerequisites**: Ensure the app is running and Playwright dependencies are installed.

## Known Limitations

### Playwright and `npm run preview`

Both the `npm run preview` command (Vite preview server) and the development server `npm run dev` are unreliable in this environment for end-to-end testing. They frequently fail with connection refused errors when accessed by Playwright.

**Guidance:**
- **Avoid using Playwright** for visual verification or end-to-end testing in this environment.
- Rely on **unit tests** and **component tests** (using `vitest` and `@testing-library/svelte`) to verify frontend logic and rendering.
- Use tools like `curl` to verify that routes are accessible and return the expected HTML structure.

## Unresolved Security Vulnerability: `node-tar`

A security vulnerability exists in `node-tar@7.5.1`, which is a bundled dependency of `npm@11.6.2`. This is a transitive dependency and cannot be resolved using `npm overrides` because it is bundled within the `npm` package itself.

- **Vulnerability:** Race condition leading to uninitialized memory exposure.
- **Tracked as:** #85
- **Patched Version:** 7.5.2
- **Current Version:** 7.5.1 (bundled in `npm@11.6.2`)

**Resolution attempts:**
- Using `overrides` in `package.json` to force `tar@7.5.2` was unsuccessful because bundled dependencies are not affected by this mechanism.

**Next Steps:**
- This vulnerability will remain until the `npm` package itself is updated to include a patched version of `tar`. No further action can be taken at this time.
