import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { BaseAPIService } from '../../../src/lib/server/base-api-service.js';

describe('BaseAPIService', () => {
	let service;
	const token = 'token';
	const baseUrl = 'https://example.com';
	const headers = { Authorization: 'Bearer token' };
	const serviceName = 'Example';

	beforeEach(() => {
		service = new BaseAPIService(token, baseUrl, headers, serviceName);
		vi.stubGlobal(
			'fetch',
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					status: 200,
					statusText: 'OK'
				})
			)
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('makes successful requests with provided options', async () => {
		const response = await service.makeRequest('/endpoint', { method: 'POST' });

		expect(fetch).toHaveBeenCalledWith('https://example.com/endpoint', {
			headers,
			method: 'POST'
		});
		expect(response.ok).toBe(true);
	});

	it('throws informative error when request fails', async () => {
		fetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: 'Server Error'
		});

		await expect(service.makeRequest('/fail')).rejects.toThrow(
			'Example API error: 500 Server Error'
		);
	});

	it('returns true when token validation succeeds', async () => {
		const validateMethod = vi.fn().mockResolvedValue();
		const result = await service.validateToken(validateMethod);

		expect(validateMethod).toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it('returns false and logs when token validation fails', async () => {
		const error = new Error('boom');
		const validateMethod = vi.fn().mockRejectedValue(error);
		const result = await service.validateToken(validateMethod);

		expect(validateMethod).toHaveBeenCalled();
		expect(result).toBe(false);
	});
});
