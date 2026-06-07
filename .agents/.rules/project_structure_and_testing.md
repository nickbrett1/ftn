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
  This runs `vitest run --changed`, which **only executes tests for files you have changed** (based on git diff). This is faster and more focused than running the full suite. If you need to run all tests (e.g. in CI), use `test-ci` instead:
  ```bash
  cd webapp && npm run test-ci
  ```
- **UI Verification**: Do **not** use Playwright for UI validation or end-to-end testing, as the environment is unreliable for external connections. Instead, rely on:
  - **Unit Tests**: For logic and utility functions.
  - **Component Tests**: Using `vitest` and `@testing-library/svelte` to verify frontend rendering and interactions.
  - **Manual Verification**: Use `curl` to verify route accessibility and HTML structure if necessary.
