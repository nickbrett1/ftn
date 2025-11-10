// webapp/tests/integration/test_tab_interface.js

import { test, expect } from '@playwright/test';

test.describe('Tab Switching Integration', () => {
    test('should switch between Capabilities and Preview tabs', async ({ page }) => {
        await page.goto('/projects/genproj');

        // Expect Capabilities tab to be active initially
        const capabilitiesTab = page.getByRole('tab', { name: 'Capabilities' });
        const previewTab = page.getByRole('tab', { name: 'Preview' });

        await expect(capabilitiesTab).toHaveAttribute('aria-selected', 'true');
        await expect(previewTab).toHaveAttribute('aria-selected', 'false');

        // Click on Preview tab
        await previewTab.click();

        // Expect Preview tab to be active
        await expect(capabilitiesTab).toHaveAttribute('aria-selected', 'false');
        await expect(previewTab).toHaveAttribute('aria-selected', 'true');

        // Click back on Capabilities tab
        await capabilitiesTab.click();

        // Expect Capabilities tab to be active again
        await expect(capabilitiesTab).toHaveAttribute('aria-selected', 'true');
        await expect(previewTab).toHaveAttribute('aria-selected', 'false');
    });

    test('should display correct content for each tab', async ({ page }) => {
        await page.goto('/projects/genproj');

        // Expect Capabilities content to be visible
        await expect(page.getByRole('heading', { name: 'Available Capabilities' })).toBeVisible();
        await expect(page.getByText('Loading preview...')).not.toBeVisible(); // Assuming preview has a loading state

        // Click on Preview tab
        await page.getByRole('tab', { name: 'Preview' }).click();

        // Expect Preview content to be visible (or loading state)
        await expect(page.getByRole('heading', { name: 'Available Capabilities' })).not.toBeVisible();
        await expect(page.getByText('Loading preview...')).toBeVisible(); // Or actual preview content
    });
});