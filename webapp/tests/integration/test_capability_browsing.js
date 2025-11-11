// webapp/tests/integration/test_capability_browsing.js

import { test, expect } from '@playwright/test';

test.describe('Capability Browsing Integration', () => {
	test('should display a list of capabilities on the genproj page', async ({ page }) => {
		await page.goto('/projects/genproj');

		// Expect the page to contain a heading for capabilities
		await expect(page.getByRole('heading', { name: 'Available Capabilities' })).toBeVisible();

		// Expect to see at least one capability listed
		// This assumes capabilities are rendered in a list or similar structure
		const capabilityCards = page.locator('[data-test-id="capability-card"]');
		await expect(capabilityCards).toHaveCountGreaterThan(0);

		// Check for specific capability names (based on capabilities.js)
		await expect(page.getByText('Node.js DevContainer')).toBeVisible();
		await expect(page.getByText('CircleCI Integration')).toBeVisible();
		await expect(page.getByText('Doppler Secrets Management')).toBeVisible();
	});

	test('should show capability descriptions', async ({ page }) => {
		await page.goto('/projects/genproj');

		// Check for a specific description
		await expect(
			page.getByText('Sets up a VS Code DevContainer with Node.js environment.')
		).toBeVisible();
	});

	// Add more integration tests as needed, e.g., filtering, searching, etc.
});
