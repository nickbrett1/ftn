import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '../../../src/routes/api-keys/+page.server.js';
import * as auth from '../../../src/lib/server/auth.js';

vi.mock('../../../src/lib/server/auth.js', () => ({
	requireUser: vi.fn()
}));

describe('/api-keys load', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('requires user authentication', async () => {
		const mockUser = { email: 'test@example.com' };
		auth.requireUser.mockResolvedValue(mockUser);

		const event = { url: new URL('http://localhost/api-keys') };
		const result = await load(event);

		expect(auth.requireUser).toHaveBeenCalledWith(event);
		expect(result).toEqual({});
	});

	it('bubbles up redirect from requireUser', async () => {
		const redirectError = new Error('Redirect');
		auth.requireUser.mockRejectedValue(redirectError);

		const event = { url: new URL('http://localhost/api-keys') };

		await expect(load(event)).rejects.toThrow('Redirect');
	});
});
