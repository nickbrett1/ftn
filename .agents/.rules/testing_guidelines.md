# Testing Guidelines

## Run Focused Tests on Changed Files Only

When running tests, always scope them to the files that have actually changed rather than running the full test suite. This keeps feedback fast and avoids noise from unrelated tests.

### How to identify changed files

Use `git` to find what has changed relative to the working directory:

```bash
# Unstaged + staged changes (everything modified vs HEAD)
git diff --name-only HEAD
```

Then map each changed source file to its corresponding test file:

| Source file      | Test file             |
| ---------------- | --------------------- |
| `src/browser.ts` | `src/browser.test.ts` |
| `src/index.ts`   | `src/index.test.ts`   |

### Running focused tests with Vitest

Pass the test file(s) directly to Vitest to limit the run:

```bash
# Single test file
npx vitest run src/browser.test.ts

# Multiple test files
npx vitest run src/browser.test.ts src/index.test.ts

# With coverage for the specific files only
npx vitest run --coverage src/browser.test.ts
```

### Full suite

Only run the full suite (`npm test`) when:

- You have changed shared utilities used by many tests, or
- You are doing a final pre-commit validation of a large change set.
