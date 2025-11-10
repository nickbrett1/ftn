// webapp/tests/e2e/genproj_tabs.spec.js

import { test, expect } from '@playwright/test';

test.describe('Genproj Two-Tab Workflow E2E', () => {
    test('should allow user to configure capabilities, view preview, and modify configuration', async ({ page }) => {
        await page.goto('/projects/genproj');

        // 1. Select some capabilities
        await page.getByLabel('Node.js DevContainer').check();
        await page.getByLabel('CircleCI Integration').check();

        // 2. Switch to Preview tab
        await page.getByRole('tab', { name: 'Preview' }).click();

        // Expect preview content to be visible (or loading state)
        await expect(page.getByText('Loading preview...')).toBeVisible();

        // 3. Switch back to Capabilities tab
        await page.getByRole('tab', { name: 'Capabilities' }).click();

        // 4. Modify capabilities
        await page.getByLabel('Node.js DevContainer').uncheck();
        await page.getByLabel('Doppler Secrets Management').check();

        // 5. Switch to Preview tab again and verify updated preview
        await page.getByRole('tab', { name: 'Preview' }).click();
        await expect(page.getByText('Loading preview...')).toBeVisible();
        // Further assertions would go here to check the actual preview content
        // based on the modified capabilities.
    });

    test('should show visual feedback when switching tabs', async ({ page }) => {
        await page.goto('/projects/genproj');

        const capabilitiesTab = page.getByRole('tab', { name: 'Capabilities' });
        const previewTab = page.getByRole('tab', { name: 'Preview' });

        // Capabilities tab should be active initially
        await expect(capabilitiesTab).toHaveClass(/active-tab-style/); // Replace with actual active tab class
        await expect(previewTab).not.toHaveClass(/active-tab-style/);

        // Switch to preview
        await previewTab.click();
        await expect(capabilitiesTab).not.toHaveClass(/active-tab-style/);
        await expect(previewTab).toHaveClass(/active-tab-style/);

        // Switch back to capabilities
        await capabilitiesTab.click();
        await expect(capabilitiesTab).toHaveClass(/active-tab-style/);
        await expect(previewTab).not.toHaveClass(/active-tab-style/);
    });
});