import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentUser } from '../../../src/lib/server/auth.js';

// Mock dependencies before import
// We need to mock $env/static/private because auth.js imports it at top level for 'github' export
vi.mock('$env/static/private', () => ({
	GITHUB_CLIENT_ID: 'mock-id',
	GITHUB_CLIENT_SECRET: 'mock-secret'
}));

// We need to mock arctic because auth.js imports it at top level for 'github' export
vi.mock('arctic', () => ({
	GitHub: class {
		constructor() {}
	}
}));

describe('getCurrentUser', () => {
	let mockFetch;

	beforeEach(() => {
		mockFetch = vi.spyOn(globalThis, 'fetch');
		// Mock console.error to keep output clean
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns null if no auth cookie', async () => {
		const event = {
			request: {
				headers: {
					get: vi.fn().mockReturnValue(null)
				}
			},
			platform: {}
		};
		const result = await getCurrentUser(event);
		expect(result).toBeNull();
	});

	it('returns null if auth cookie is deleted', async () => {
		const event = {
			request: {
				headers: {
					get: vi.fn().mockReturnValue('auth=deleted')
				}
			},
			platform: {}
		};
		const result = await getCurrentUser(event);
		expect(result).toBeNull();
	});

	it('returns null if KV is missing', async () => {
		const event = {
			request: {
				headers: {
					get: vi.fn().mockReturnValue('auth=some-token')
				}
			},
			platform: {} // no env
		};
		const result = await getCurrentUser(event);
		expect(result).toBeNull();
	});

	it('returns null if token not found in KV', async () => {
		const event = {
			request: {
				headers: {
					get: vi.fn().mockReturnValue('auth=some-token')
				}
			},
			platform: {
				env: {
					KV: {
						get: vi.fn().mockResolvedValue(null)
					}
				}
			}
		};
		const result = await getCurrentUser(event);
		expect(result).toBeNull();
		expect(event.platform.env.KV.get).toHaveBeenCalledWith('some-token');
	});

	it('returns null if Google API fails', async () => {
		const event = {
			request: {
				headers: {
					get: vi.fn().mockReturnValue('auth=some-token')
				}
			},
			platform: {
				env: {
					KV: {
						get: vi.fn().mockResolvedValue('google-token')
					}
				}
			}
		};
		mockFetch.mockResolvedValue({
			ok: false
		});

		const result = await getCurrentUser(event);
		expect(result).toBeNull();
		// Verifying it calls Google API as per implementation
		expect(mockFetch).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: { Authorization: 'Bearer google-token' }
		});
	});

	it('returns user object on success', async () => {
		const event = {
			request: {
				headers: {
					get: vi.fn().mockReturnValue('auth=some-token')
				}
			},
			platform: {
				env: {
					KV: {
						get: vi.fn().mockResolvedValue('google-token')
					}
				}
			}
		};
		mockFetch.mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				id: '123',
				email: 'test@example.com',
				name: 'Test User'
			})
		});

		const result = await getCurrentUser(event);
		expect(result).toEqual({
			id: 'test@example.com', // logic uses email or id
			email: 'test@example.com',
			name: 'Test User',
			expiresAt: expect.any(Date)
		});
	});

	it('handles exceptions', async () => {
		const event = {
			request: {
				headers: {
					get: vi.fn().mockImplementation(() => {
						throw new Error('Boom');
					})
				}
			}
		};
		const result = await getCurrentUser(event);
		expect(result).toBeNull();
		expect(console.error).toHaveBeenCalled();
	});
});
