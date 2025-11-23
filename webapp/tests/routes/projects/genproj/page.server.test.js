// webapp/tests/routes/projects/genproj/page.server.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '../../../../src/routes/projects/genproj/+page.server.js';

// Mock redirect from @sveltejs/kit
vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		redirect: vi.fn((status, location) => {
			const error = new Error('Redirected');
			// @ts-ignore
			error.status = status;
			// @ts-ignore
			error.location = location;
			throw error;
		})
	};
});

describe('genproj +page.server load', () => {
	let mockLocals;
	let mockUrl;

	beforeEach(() => {
		mockLocals = {
			user: null
		};
		mockUrl = new URL('http://localhost/projects/genproj');
		vi.clearAllMocks();
	});

	it('returns unauthenticated state when user is not logged in', async () => {
		const result = await load({ locals: mockLocals, url: mockUrl });
		expect(result).toEqual({
			isAuthenticated: false,
			authResult: null,
			selectedCapabilities: [],
			projectName: '',
			repositoryUrl: ''
		});
	});

	it('returns authenticated user data when user is logged in', async () => {
		mockLocals.user = { id: '123', email: 'test@example.com' }; // Simulate logged-in user
		const result = await load({ locals: mockLocals, url: mockUrl });
		expect(result).toEqual({
			isAuthenticated: true,
			authResult: null,
			selectedCapabilities: [],
			projectName: '',
			repositoryUrl: ''
		});
	});

	it('parses authResult from URL search params', async () => {
		mockUrl = new URL('http://localhost/projects/genproj?auth=success');
		const result = await load({ locals: mockLocals, url: mockUrl });
		expect(result.authResult).toBe('success');
	});

	it('parses selectedCapabilities, projectName, and repositoryUrl from URL search params', async () => {
		mockUrl = new URL(
			'http://localhost/projects/genproj?selected=cap1,cap2&projectName=MyProject&repositoryUrl=http://github.com/user/repo'
		);
		const result = await load({ locals: mockLocals, url: mockUrl });
		expect(result.selectedCapabilities).toEqual(['cap1', 'cap2']);
		expect(result.projectName).toBe('MyProject');
		expect(result.repositoryUrl).toBe('http://github.com/user/repo');
	});

	it('redirects to /notauthorised if authError is present in URL', async () => {
		mockUrl = new URL('http://localhost/projects/genproj?error=access_denied');

		let caughtError;
		try {
			await load({ locals: mockLocals, url: mockUrl });
		} catch (e) {
			caughtError = e;
		}

		expect(caughtError).toBeInstanceOf(Error);
		// @ts-ignore
		expect(caughtError.status).toBe(302);
		// @ts-ignore
		expect(caughtError.location).toBe('/notauthorised?message=access_denied');
	});
});
