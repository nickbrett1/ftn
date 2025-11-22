import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getCurrentUser } from '../../../src/lib/server/auth-helpers.js';

const createRequestWithCookie = (cookieValue) => {
	return new Request('https://example.com', {
		headers: cookieValue
			? {
					cookie: `auth=${cookieValue}; other=value`
				}
			: {}
	});
};

describe('getCurrentUser', () => {
	let kv;
	let platform;
	let fetchMock;
	let errorSpy;

	beforeEach(() => {
		kv = {
			get: vi.fn()
		};
		platform = { env: { KV: kv } };
		fetchMock = vi.fn();
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns null when auth cookie is missing', async () => {
		const request = createRequestWithCookie(null);
		const result = await getCurrentUser(request, platform);
		expect(result).toBeNull();
		expect(kv.get).not.toHaveBeenCalled();
	});

	it('returns null when auth cookie is marked as deleted', async () => {
		const request = createRequestWithCookie('deleted');
		const result = await getCurrentUser(request, platform);
		expect(result).toBeNull();
		expect(kv.get).not.toHaveBeenCalled();
	});

	it('returns null when KV binding is unavailable', async () => {
		const request = createRequestWithCookie('session-token');
		const result = await getCurrentUser(request, { env: {} });
		expect(result).toBeNull();
	});

	it('returns null when no token found in KV', async () => {
		const request = createRequestWithCookie('session-token');
		kv.get.mockResolvedValueOnce(null);
		const result = await getCurrentUser(request, platform);
		expect(result).toBeNull();
		expect(kv.get).toHaveBeenCalledWith('session-token');
	});

	it('returns null when Google API call fails', async () => {
		const request = createRequestWithCookie('session-token');
		kv.get.mockResolvedValueOnce('google-access-token');
		fetchMock.mockResolvedValueOnce({ ok: false });
		const result = await getCurrentUser(request, platform);
		expect(result).toBeNull();
		expect(fetchMock).toHaveBeenCalledWith(
			'https://www.googleapis.com/oauth2/v2/userinfo',
			expect.objectContaining({ headers: expect.any(Object) })
		);
	});

	it('returns user info when Google API request succeeds', async () => {
		const request = createRequestWithCookie('session-token');
		kv.get.mockResolvedValueOnce('google-access-token');
		const mockUserInfo = {
			email: 'user@example.com',
			name: 'Example User',
			id: '12345'
		};
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockUserInfo)
		});
		const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(0);

		const result = await getCurrentUser(request, platform);

		expect(result).toMatchObject({
			id: 'user@example.com',
			email: 'user@example.com',
			name: 'Example User'
		});
		expect(result.expiresAt).toEqual(new Date(3600 * 1000));
		nowSpy.mockRestore();
	});

	it('returns null and logs error when fetch throws', async () => {
		const request = createRequestWithCookie('session-token');
		kv.get.mockResolvedValueOnce('google-access-token');
		fetchMock.mockRejectedValueOnce(new Error('network failure'));

		const result = await getCurrentUser(request, platform);

		expect(result).toBeNull();
		expect(errorSpy).toHaveBeenCalled();
		const [message, error] = errorSpy.mock.calls.at(-1);
		expect(message).toContain('Error getting current user');
		expect(error).toBeInstanceOf(Error);
	});
});