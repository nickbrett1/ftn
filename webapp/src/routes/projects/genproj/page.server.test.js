import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sveltejs/kit', () => ({
	/**
	 * Mimics SvelteKit's error helper by returning an Error with status metadata.
	 * @param {number} status
	 * @param {string} message
	 */
	error: (status, message) => {
		const error = new Error(message);
		error.status = status;
		return error;
	}
}));

// Use the actual capabilities module so the load function behaviour matches production.
vi.mock('$lib/config/capabilities.js', async () => {
	const actual = await vi.importActual('$lib/config/capabilities.js');
	return actual;
});

import { load } from './+page.server.js';

describe('genproj +page.server load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns page data with selected capabilities and authenticated state', async () => {
		const kvGet = vi.fn().mockResolvedValue('valid-token');
		const cookies = { get: vi.fn().mockReturnValue('auth-cookie') };
		const platform = { env: { KV: { get: kvGet } } };
		const url = new URL(
			'https://example.com/projects/genproj?selected=devcontainer-node,doppler&validate=true'
		);

		const result = await load({ params: {}, url, platform, cookies });

		expect(cookies.get).toHaveBeenCalledWith('auth');
		expect(kvGet).toHaveBeenCalledWith('auth-cookie');
		expect(result).toMatchObject({
			selectedCapabilities: ['devcontainer-node', 'doppler'],
			isAuthenticated: true,
			validation: { valid: true, errors: [] }
		});
		expect(Array.isArray(result.capabilities)).toBe(true);
		expect(result.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
	});

	it('returns unauthenticated state when no auth cookie or KV binding', async () => {
		const cookies = { get: vi.fn().mockReturnValue() };
		const platform = { env: {} };
		const url = new URL('https://example.com/projects/genproj?selected=&validate=false');

		const result = await load({ params: {}, url, platform, cookies });

		expect(result.selectedCapabilities).toEqual([]);
		expect(result.isAuthenticated).toBe(false);
		expect(result.validation).toBeUndefined();
	});

	it('throws a 500 error when KV lookup fails', async () => {
		const kvError = new Error('KV failure');
		const kvGet = vi.fn().mockRejectedValue(kvError);
		const cookies = { get: vi.fn().mockReturnValue('auth-cookie') };
		const platform = { env: { KV: { get: kvGet } } };
		const url = new URL('https://example.com/projects/genproj');
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(load({ params: {}, url, platform, cookies })).rejects.toMatchObject({
			status: 500,
			message: 'Failed to load page data'
		});
		expect(consoleSpy).toHaveBeenCalledWith('❌ Error loading genproj page data:', kvError);
		consoleSpy.mockRestore();
	});
});
