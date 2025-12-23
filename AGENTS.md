# Agent Information and Known Issues

This document provides information for AI agents working on this codebase.

## Project Structure & Testing

- **Root Directory**: The repository root contains configuration and documentation.
- **Web Application**: The main application code and configuration, including `package.json`, are located in the `webapp/` subdirectory.
- **Dependency Installation**: Before running tests or building the project, you must install dependencies by running `npm install` from within the `webapp/` directory:
  ```bash
  cd webapp && npm install
  ```
- **Running Tests**: To run the test suite, use the `test:once` script from within the `webapp/` directory:
  ```bash
  cd webapp && npm run test:once
  ```
- **UI Verification**: Do **not** use Playwright for UI validation or end-to-end testing, as the environment is unreliable for external connections. Instead, rely on:
  - **Unit Tests**: For logic and utility functions.
  - **Component Tests**: Using `vitest` and `@testing-library/svelte` to verify frontend rendering and interactions.
  - **Manual Verification**: Use `curl` to verify route accessibility and HTML structure if necessary.

## Image Handling

We use **@zerodevx/svelte-img** for optimized image loading.

1.  **Placement**: Store all source images in `webapp/src/lib/images/`.
2.  **Importing**: Import images in your Svelte components with the `?as=run` query parameter.
    ```javascript
    import myImage from '$lib/images/my-image.jpg?as=run';
    ```
3.  **Usage**: Use the `Img` component to display them.
    ```html
    <script>
      import Img from '@zerodevx/svelte-img';
      import myImage from '$lib/images/my-image.jpg?as=run';
    </script>

    <Img src={myImage} alt="Description" class="your-classes" />
    ```

## Known Limitations

### Unresolved Security Vulnerability: `node-tar`

A security vulnerability exists in `node-tar@7.5.1`, which is a bundled dependency of `npm@11.6.2`. This is a transitive dependency and cannot be resolved using `npm overrides` because it is bundled within the `npm` package itself.

- **Vulnerability:** Race condition leading to uninitialized memory exposure.
- **Tracked as:** #85
- **Patched Version:** 7.5.2
- **Current Version:** 7.5.1 (bundled in `npm@11.6.2`)

**Resolution attempts:**
- Using `overrides` in `package.json` to force `tar@7.5.2` was unsuccessful because bundled dependencies are not affected by this mechanism.

**Next Steps:**
- This vulnerability will remain until the `npm` package itself is updated to include a patched version of `tar`. No further action can be taken at this time.
