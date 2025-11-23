import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

const originalFetch = globalThis.fetch;

const createJsonResponse = (data, init = {}) =>
	Response.json(data, {
		status: init.status ?? 200,
		headers: {
			'Content-Type': 'application/json'
		}
	});

describe('Deploys API route', () => {
	beforeEach(() => {
		vi.resetModules();
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		globalThis.fetch = originalFetch;
	});

	const loadModule = async (environmentValues) => {
		vi.doMock('$env/dynamic/private', () => ({
			env: environmentValues
		}));

		return import('../../../src/routes/api/deploys/+server.js');
	};

	it('returns deployment information when preview and production workers exist', async () => {
		const accountId = 'account-123';
		const apiToken = 'token-abc';
		const previewWorker = {
			id: 'ftn-preview',
			created_on: '2024-01-01T00:00:00.000Z',
			metadata: {
				branch: 'main',
				git_commit: 'abcdef1234567890'
			}
		};
		const productionWorker = {
			id: 'ftn-production',
			created_on: '2024-01-02T00:00:00.000Z',
			metadata: {
				branch: 'release',
				git_commit: 'fedcba0987654321'
			}
		};

		const { GET } = await loadModule({
			CLOUDFLARE_ACCOUNT_ID: accountId,
			CLOUDFLARE_DEPLOYS_TOKEN: apiToken
		});

		globalThis.fetch
			.mockResolvedValueOnce(
				createJsonResponse({
					success: true,
					result: [previewWorker, productionWorker, { id: 'other-worker' }]
				})
			)
			.mockResolvedValueOnce(
				createJsonResponse({
					result: [
						{
							id: 'preview-deploy-1',
							created_on: '2024-01-10T00:00:00.000Z',
							metadata: {
								branch: 'main',
								git_commit: '12345678abcd1234'
							}
						}
					]
				})
			)
			.mockResolvedValueOnce(
				createJsonResponse({
					result: [
						{
							id: 'prod-deploy-1',
							created_on: '2024-01-11T00:00:00.000Z',
							metadata: {
								branch: 'release',
								git_commit: '87654321abcd8765'
							}
						}
					]
				})
			)
			.mockResolvedValueOnce(
				createJsonResponse({
					success: true,
					result: [
						{ id: '5', created_on: '2024-01-12T00:00:00.000Z' },
						{ id: '6', created_on: '2024-01-13T00:00:00.000Z' }
					]
				})
			);

		const response = await GET({ request: new Request('https://app.test/api/deploys') });
		expect(response.status).toBe(200);
		const payload = await response.json();

		expect(Array.isArray(payload)).toBe(true);
		expect(payload.length).toBeGreaterThanOrEqual(2);

		const previewDeployment = payload.find((item) => item.name === 'Preview Environment');
		expect(previewDeployment).toBeDefined();
		expect(previewDeployment.environment).toBe('preview');
		expect(previewDeployment.version.split('-')).toEqual(['preview', 'main', '12345678']);
		expect(typeof previewDeployment.deployedAt).toBe('string');
		expect(previewDeployment.deployedAt.length).toBeGreaterThan(0);

		const productionDeployment = payload.find((item) => item.name === 'Production Environment');
		expect(productionDeployment).toBeDefined();
		expect(productionDeployment.environment).toBe('production');
		expect(productionDeployment.version.split('-')).toEqual(['prod', 'release', '87654321']);
	});

	it('falls back to version endpoint when deployment metadata is unavailable', async () => {
		const { GET } = await loadModule({
			CLOUDFLARE_ACCOUNT_ID: 'acc',
			CLOUDFLARE_DEPLOYS_TOKEN: 'token'
		});

		globalThis.fetch
			.mockResolvedValueOnce(
				createJsonResponse({
					success: true,
					result: [{ id: 'ftn-preview', created_on: '2024-02-01T00:00:00.000Z' }]
				})
			)
			.mockResolvedValueOnce(createJsonResponse({ result: [] }))
			.mockResolvedValueOnce(
				createJsonResponse({
					result: [
						{
							id: 'preview-version-1',
							created_on: '2024-02-05T00:00:00.000Z',
							metadata: {
								branch: 'beta',
								git_commit: '9988776655443322'
							}
						}
					]
				})
			)
			.mockResolvedValueOnce(createJsonResponse({ success: true, result: [] }));

		const response = await GET({ request: new Request('https://app.test/api/deploys') });
		expect(response.status).toBe(200);
		const payload = await response.json();
		const previewDeployment = payload[0];
		expect(previewDeployment.version.split('-')).toEqual(
			expect.arrayContaining(['preview', expect.any(String)])
		);
	});

	it('throws an HttpError when required environment variables are missing', async () => {
		const { GET } = await loadModule({});

		await expect(
			GET({ request: new Request('https://app.test/api/deploys') })
		).rejects.toMatchObject({
			status: 500
		});
	});

	it('propagates Cloudflare API failures with descriptive error messages', async () => {
		const accountId = 'account';
		const apiToken = 'token';
		const { GET } = await loadModule({
			CLOUDFLARE_ACCOUNT_ID: accountId,
			CLOUDFLARE_DEPLOYS_TOKEN: apiToken
		});

		globalThis.fetch.mockResolvedValueOnce(
			new Response('Service unavailable', {
				status: 503,
				statusText: 'Service Unavailable'
			})
		);

		await expect(
			GET({ request: new Request('https://app.test/api/deploys') })
		).rejects.toMatchObject({
			status: 500,
			body: expect.objectContaining({
				message: expect.stringContaining('Failed to list Cloudflare Workers')
			})
		});
	});
});
