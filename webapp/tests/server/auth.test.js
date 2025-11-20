import { describe, it, expect, vi } from 'vitest';
import { getCurrentUser, github } from '$lib/server/auth.js';

vi.mock('$env/static/private', () => ({
	GITHUB_CLIENT_ID: 'test-github-client-id'
}));

describe('auth', () => {
	describe('getCurrentUser', () => {
		it('should return a dummy user', async () => {
			const event = {};
			const user = await getCurrentUser(event);
			expect(user).toEqual({
				id: 'dummy-user-id',
				name: 'Dummy User',
				email: 'dummy@example.com'
			});
		});
	});

	describe('github', () => {
		describe('createAuthorizationURL', () => {
			it('should create a valid GitHub authorization URL', async () => {
				const state = 'test-state';
				const eventUrl = new URL('https://example.com/auth/login');
				const url = await github.createAuthorizationURL(state, eventUrl);

				expect(url.origin).toBe('https://github.com');
				expect(url.pathname).toBe('/login/oauth/authorize');
				expect(url.searchParams.get('client_id')).toBe('test-github-client-id');
				expect(url.searchParams.get('state')).toBe(state);
				expect(url.searchParams.get('redirect_uri')).toBe(
					'https://example.com/auth/github/callback'
				);
				expect(url.searchParams.get('scope')).toBe('repo,user');
			});
		});
	});
});
