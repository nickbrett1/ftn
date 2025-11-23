import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../../../src/routes/auth/github/+server.js';
import { github } from '$lib/server/auth.js';
import { nanoid } from 'nanoid';
import { redirect } from '@sveltejs/kit';

// Mock dependencies
vi.mock('$lib/server/auth.js', () => ({
	github: {
		createAuthorizationURL: vi.fn()
	}
}));
vi.mock('nanoid', () => ({
	nanoid: vi.fn()
}));
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn((status, location) => {
		// Throw an object that can be caught and asserted against
		const error = new Error(`Redirecting to ${location}`);
		error.status = status;
		error.location = location;
		throw error;
	})
}));

describe('/auth/github/+server.js', () => {
	let mockEvent;
	const mockState = 'mock-nanoid-state';
	const mockAuthUrl = 'https://github.com/login/oauth/authorize?state=mock-nanoid-state';

	beforeEach(() => {
		vi.resetAllMocks();

		vi.mocked(nanoid).mockReturnValue(mockState);
		vi.mocked(github.createAuthorizationURL).mockResolvedValue(new URL(mockAuthUrl));

		mockEvent = {
			cookies: {
				set: vi.fn()
			},
			url: new URL('http://localhost/auth/github')
		};
	});

	it('should generate a state, set a cookie, and redirect to the GitHub auth URL', async () => {
		try {
			await GET(mockEvent);
			// We expect a redirect, so this line should not be reached.
			expect.fail('GET should have thrown a redirect.');
		} catch (error) {
			// Verify state generation
			expect(nanoid).toHaveBeenCalledOnce();

			// Verify auth URL creation
			expect(github.createAuthorizationURL).toHaveBeenCalledWith(mockState, mockEvent.url);

			// Verify cookie setting
			expect(mockEvent.cookies.set).toHaveBeenCalledWith('github_oauth_state', mockState, {
				path: '/',
				secure: false, // Based on import.meta.env.PROD which is false in test
				httpOnly: true,
				maxAge: 600, // 60 * 10
				sameSite: 'lax'
			});

			// Verify redirection
			expect(redirect).toHaveBeenCalledWith(302, mockAuthUrl);
			expect(error.status).toBe(302);
			expect(error.location).toBe(mockAuthUrl);
		}
	});

	it('should set the secure flag on cookies in production', async () => {
		// Temporarily set the environment to production for this test
		const originalEnvironment = import.meta.env.PROD;
		import.meta.env.PROD = true;

		try {
			await GET(mockEvent);
			expect.fail('GET should have thrown a redirect.');
		} catch {
			// Check that the secure flag is now true
			expect(mockEvent.cookies.set).toHaveBeenCalledWith(
				'github_oauth_state',
				mockState,
				expect.objectContaining({ secure: true })
			);
		} finally {
			// Restore the original environment
			import.meta.env.PROD = originalEnvironment;
		}
	});
});
