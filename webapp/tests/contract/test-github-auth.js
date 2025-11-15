// webapp/tests/contract/test_github_auth.js

import { test, expect } from '@playwright/test';

test.describe('GitHub Auth Endpoint Contract', () => {
	test('GET /api/projects/genproj/api/auth/github should redirect to GitHub OAuth', async ({
		request
	}) => {
		const response = await request.get('/api/projects/genproj/api/auth/github', {
			maxRedirects: 0 // Do not follow redirects
		});

		expect(response.status()).toBe(302); // Expect a redirect status
		const location = response.headers().location;
		expect(location).toMatch(/^https:\/\/github.com\/login\/oauth\/authorize/);
		expect(location).toContain('client_id=');
		expect(location).toContain('scope=');
		expect(location).toContain('redirect_uri=');
	});

	test('GET /api/projects/genproj/api/auth/github/callback should handle OAuth callback', async ({
		request
	}) => {
		// This test is more complex as it requires mocking GitHub's OAuth flow.
		// For a contract test, we can simulate the expected request and check the response.
		// In a real scenario, you might use a test utility to mock the external API call.

		// Simulate a successful GitHub OAuth callback with a dummy code
		const dummyCode = 'dummy_github_code';
		const response = await request.get(
			`/api/projects/genproj/api/auth/github/callback?code=${dummyCode}`,
			{
				maxRedirects: 0 // Do not follow redirects
			}
		);

		// Expect a redirect to the genproj page or a success page
		expect(response.status()).toBe(302);
		const location = response.headers().location;
		expect(location).toMatch(/\/projects\/genproj|\/auth\/success/); // Redirect to genproj or success page
	});

	test('GET /api/projects/genproj/api/auth/github/callback should handle OAuth errors', async ({
		request
	}) => {
		// Simulate a GitHub OAuth callback with an error
		const errorResponse = await request.get(
			`/api/projects/genproj/api/auth/github/callback?error=access_denied`,
			{
				maxRedirects: 0 // Do not follow redirects
			}
		);

		// Expect a redirect to an error page or the genproj page with an error message
		expect(errorResponse.status()).toBe(302);
		const location = errorResponse.headers().location;
		expect(location).toMatch(/\/auth\/error|\/projects\/genproj\?error=access_denied/);
	});
});
