import { GET } from '../../../../../../../../src/routes/projects/genproj/api/auth/github/callback/+server.js';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';
import { dev } from '$app/environment';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('$env/static/private', () => ({
	GITHUB_CLIENT_ID: 'test-client-id',
	GITHUB_CLIENT_SECRET: 'test-client-secret'
}));

vi.mock('$app/environment', () => ({
	dev: true
}));

describe('/projects/genproj/api/auth/github/callback', () => {
	let event;
	beforeEach(() => {
		const url = new URL('http://localhost/projects/genproj/api/auth/github/callback?code=test-code&state=test-state');
		event = {
			url,
			cookies: {
				get: vi.fn(),
				set: vi.fn(),
				delete: vi.fn()
			},
			fetch: vi.fn()
		};
	});

	it('should redirect to the generate page on success', async () => {
		event.cookies.get.mockReturnValue(JSON.stringify({ sessionId: 'test-state', projectName: 'test', selected: 'a,b' }));
		event.fetch.mockResolvedValue(
			new Response(JSON.stringify({ access_token: 'test-token' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);

		try {
			await GET(event);
			expect.fail('GET should have thrown a redirect');
		} catch (e) {
			expect(e.status).toBe(302);
			const location = e.location;
			expect(location).toContain('/projects/genproj/generate');
			const locationUrl = new URL(location, 'http://localhost');
			expect(locationUrl.searchParams.get('projectName')).toBe('test');
			expect(locationUrl.searchParams.get('selected')).toBe('a,b');
		}
	});

	it('should redirect to the genproj page with an error if the state is missing', async () => {
		event.cookies.get.mockReturnValue(null);

		try {
			await GET(event);
			expect.fail('GET should have thrown a redirect');
		} catch (e) {
			expect(e.status).toBe(302);
			expect(e.location).toBe('/projects/genproj?error=no_state');
		}
	});

	it('should redirect to the genproj page with an error if the state is mismatched', async () => {
		event.cookies.get.mockReturnValue(JSON.stringify({ sessionId: 'wrong-state' }));

		try {
			await GET(event);
			expect.fail('GET should have thrown a redirect');
		} catch (e) {
			expect(e.status).toBe(302);
			expect(e.location).toBe('/projects/genproj?error=state_mismatch');
		}
	});

	it('should redirect to the genproj page with an error if the GitHub API returns an error', async () => {
		event.cookies.get.mockReturnValue(JSON.stringify({ sessionId: 'test-state' }));
		event.fetch.mockResolvedValue(
			new Response(JSON.stringify({ error: 'bad_verification_code' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);

		try {
			await GET(event);
			expect.fail('GET should have thrown a redirect');
		} catch (e) {
			expect(e.status).toBe(302);
			expect(e.location).toBe('/projects/genproj?error=bad_verification_code');
		}
	});

	it('should redirect to the genproj page with an error if the token exchange fetch fails', async () => {
		event.cookies.get.mockReturnValue(JSON.stringify({ sessionId: 'test-state' }));
		event.fetch.mockRejectedValue(new Error('fetch failed'));

		try {
			await GET(event);
		} catch (e) {
			expect(e.status).toBe(302);
			expect(e.location).toBe('/projects/genproj?error=token_exchange_failed');
		}
	});
});
