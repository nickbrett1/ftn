import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { load } from './+page.server.js';
import { getCurrentUser } from '$lib/server/auth';

vi.mock('$lib/server/auth', () => ({
	getCurrentUser: vi.fn()
}));

describe('genproj +page.server load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns authenticated user data when user is logged in', async () => {
		const user = { id: '123', name: 'Test User', email: 'test@example.com' };
		vi.mocked(getCurrentUser).mockResolvedValue(user);

		const result = await load({ locals: {} });

		expect(getCurrentUser).toHaveBeenCalledWith({ locals: {} });
		expect(result).toEqual({
			isAuthenticated: true,
			user: { id: '123', name: 'test@example.com', email: 'test@example.com' },
			capabilities: expect.any(Array)
		});
	});

	it('returns unauthenticated state when user is not logged in', async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(null);
		const result = await load({ locals: {} });

		expect(result).toEqual({
			isAuthenticated: false,
			user: null,
			capabilities: expect.any(Array)
		});
	});
});
