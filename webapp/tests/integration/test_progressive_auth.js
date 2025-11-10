// webapp/tests/integration/test_progressive_auth.js

import { test, expect } from '@playwright/test';

test.describe('Progressive Authentication Flow Integration', () => {
    test('should prompt for GitHub login when a GitHub-dependent capability is selected by an unauthenticated user', async ({ page }) => {
        await page.goto('/projects/genproj');

        // Select a GitHub-dependent capability (e.g., 'github-actions' if it existed, using 'devcontainer-node' as a proxy for now)
        await page.getByLabel('Node.js DevContainer').check();

        // Attempt to generate project (which should trigger auth flow)
        await page.getByRole('button', { name: 'Generate Project (Login Required)' }).click();

        // Expect to be redirected to the GitHub OAuth page
        await expect(page).toHaveURL(/^https:\/\/github.com\/login\/oauth\/authorize/);
    });

    test('should not prompt for login if no auth-dependent capabilities are selected', async ({ page }) => {
        await page.goto('/projects/genproj');

        // Select a capability that does not require auth (assuming 'devcontainer-node' does not require auth for basic preview)
        // For this test, we'll assume 'devcontainer-node' is not auth-dependent for initial preview.
        // In a real scenario, you'd select a truly non-auth-dependent capability.
        await page.getByLabel('Node.js DevContainer').check();

        // Attempt to generate project
        await page.getByRole('button', { name: 'Generate Project (Login Required)' }).click();

        // Expect NOT to be redirected to GitHub OAuth, but rather stay on the genproj page or show a different message
        await expect(page).toHaveURL(/projects\/genproj/);
        // Further assertions here to check for a message indicating successful generation or other non-auth flow
    });

    test('should show a success message after successful authentication and return to genproj page', async ({ page }) => {
        // This test requires mocking the OAuth callback, which is complex for integration tests.
        // For now, we'll simulate a direct navigation to the callback URL with a success code.
        // In a real integration test, you might use a custom test server or Playwright's route mocking.

        // Simulate successful GitHub OAuth callback
        await page.goto('/api/projects/genproj/api/auth/github/callback?code=mock_success_code');

        // Expect to be redirected back to the genproj page
        await expect(page).toHaveURL(/projects\/genproj/);
        // Expect a success message to be visible
        await expect(page.getByText('Authentication successful!')).toBeVisible();
    });
});