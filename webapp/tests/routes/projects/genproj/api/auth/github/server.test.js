import { GET } from '../../../../../../../src/routes/projects/genproj/api/auth/github/+server.js';
import { dev } from '$app/environment';
import { RequestEvent } from '@sveltejs/kit';
import { vi, describe, it, expect } from 'vitest';

vi.mock('$env/static/private', () => ({
	DEV_GITHUB_CLIENT_ID: 'test-client-id',
	DEV_GITHUB_CLIENT_SECRET: 'test-client-secret',
	PREVIEW_GITHUB_CLIENT_ID: 'preview-test-client-id',
	PREVIEW_GITHUB_CLIENT_SECRET: 'preview-test-client-secret',
	PROD_GITHUB_CLIENT_ID: 'prod-test-client-id',
	PROD_GITHUB_CLIENT_SECRET: 'prod-test-client-secret'
}));

vi.mock('$app/environment', () => ({
	dev: true
}));

describe('/projects/genproj/api/auth/github', () => {
	it('should redirect to GitHub with the correct parameters', async () => {
		const url = new URL(
			'http://localhost/projects/genproj/api/auth/github?projectName=test&selected=a,b'
		);
		/** @type {RequestEvent} */
		const event = {
			url,
			cookies: {
				// @ts-ignore
				set: vi.fn()
			}
		};

		try {
			// @ts-ignore
			await GET(event);
			// This should not be reached
			expect.fail('GET should have thrown a redirect');
		} catch (error) {
			// @ts-ignore
			expect(error.status).toBe(302);
			// @ts-ignore
			const location = error.location;
			expect(location).toContain('https://github.com/login/oauth/authorize');
			const locationUrl = new URL(location);
			expect(locationUrl.searchParams.get('client_id')).toBe('test-client-id');
			expect(locationUrl.searchParams.get('scope')).toBe('repo');
			expect(locationUrl.searchParams.get('state')).toBeTruthy();
			expect(locationUrl.searchParams.get('redirect_uri')).toBe(
				'http://localhost/projects/genproj/api/auth/github/callback'
			);
		}
	});
});
