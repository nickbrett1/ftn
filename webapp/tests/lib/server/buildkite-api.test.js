import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { BuildkiteAPIService } from '../../../src/lib/server/buildkite-api.js';

describe('BuildkiteAPIService', () => {
	let service;

	beforeEach(() => {
		service = new BuildkiteAPIService('token');
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends a bearer token and surfaces API errors', async () => {
		const successResponse = { ok: true, status: 200, statusText: 'OK' };
		fetch.mockResolvedValueOnce(successResponse);

		await expect(service.makeRequest('/access-token')).resolves.toEqual(successResponse);
		expect(fetch).toHaveBeenCalledWith('https://api.buildkite.com/v2/access-token', {
			headers: service.headers
		});

		fetch.mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' });
		await expect(service.makeRequest('/access-token')).rejects.toThrow(
			'Buildkite API error: 403 Forbidden'
		);
	});

	it('wraps the repository file rather than sending an empty configuration', () => {
		// An omitted configuration is rejected outright; an EMPTY one is
		// accepted and produces zero-step builds. Both look like a broken
		// pipeline, so the wrapper is always sent.
		const wrapper = BuildkiteAPIService.configurationWrapper();
		expect(wrapper.trim().length).toBeGreaterThan(0);
		expect(wrapper).toContain('buildkite-agent pipeline upload .buildkite/pipeline.yml');
	});

	it('creates a pipeline with a non-empty configuration and the cluster id', async () => {
		const json = vi.fn().mockResolvedValue({ slug: 'demo', id: 'p1' });
		const makeRequest = vi.spyOn(service, 'makeRequest').mockResolvedValue({ json });

		const result = await service.createPipeline('nick-brett', {
			name: 'demo',
			repository: 'https://github.com/nickbrett1/demo.git',
			clusterId: 'cluster-1'
		});

		expect(result).toEqual({ pipeline: { slug: 'demo', id: 'p1' }, existed: false });
		const [endpoint, options] = makeRequest.mock.calls[0];
		expect(endpoint).toBe('/organizations/nick-brett/pipelines');
		expect(options.method).toBe('POST');

		const body = JSON.parse(options.body);
		expect(body.name).toBe('demo');
		expect(body.cluster_id).toBe('cluster-1');
		expect(body.default_branch).toBe('main');
		expect(body.configuration).toContain('pipeline upload');
	});

	it('treats an existing pipeline name as success and reuses it', async () => {
		// Regenerating a project must not fail because the pipeline is already
		// there; the whole flow needs to be safe to re-run.
		const createError = new Error(
			'Buildkite API error: 422 Unprocessable Entity - {"message":"Validation Failed","errors":[{"field":"name","message":"has already been taken"}]}'
		);
		const makeRequest = vi
			.spyOn(service, 'makeRequest')
			.mockRejectedValueOnce(createError)
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue({ slug: 'demo' }) });

		const result = await service.createPipeline('nick-brett', {
			name: 'demo',
			repository: 'https://github.com/nickbrett1/demo.git'
		});

		expect(result.existed).toBe(true);
		expect(result.pipeline).toEqual({ slug: 'demo' });
		expect(makeRequest.mock.calls[1][0]).toBe('/organizations/nick-brett/pipelines/demo');
	});

	it('does not send cluster_id when none is configured', async () => {
		const makeRequest = vi
			.spyOn(service, 'makeRequest')
			.mockResolvedValue({ json: vi.fn().mockResolvedValue({ slug: 'demo' }) });

		await service.createPipeline('org', { name: 'demo', repository: 'https://example.com/a.git' });

		const body = JSON.parse(makeRequest.mock.calls[0][1].body);
		expect(body.cluster_id).toBeUndefined();
	});

	it('retries creation while the repository is invisible to the GitHub App', async () => {
		const retrying = new BuildkiteAPIService('token', {
			createRetry: { attempts: 3, baseDelayMs: 1, maxDelayMs: 2, backoffFactor: 2 }
		});
		const makeRequest = vi
			.spyOn(retrying, 'makeRequest')
			.mockRejectedValueOnce(new Error('Buildkite API error: 404 Not Found'))
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue({ slug: 'demo' }) });

		vi.useFakeTimers();
		try {
			const promise = retrying.createPipeline('org', {
				name: 'demo',
				repository: 'https://example.com/a.git'
			});
			await vi.advanceTimersByTimeAsync(2);
			const result = await promise;

			expect(result.existed).toBe(false);
			expect(makeRequest).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not retry creation on an auth failure', async () => {
		const retrying = new BuildkiteAPIService('token', {
			createRetry: { attempts: 3, baseDelayMs: 1, maxDelayMs: 2 }
		});
		vi.spyOn(retrying, 'makeRequest').mockRejectedValue(
			new Error('Buildkite API error: 403 Forbidden')
		);

		await expect(
			retrying.createPipeline('org', { name: 'demo', repository: 'https://example.com/a.git' })
		).rejects.toThrow('Buildkite API error: 403 Forbidden');
		expect(retrying.makeRequest).toHaveBeenCalledTimes(1);
	});

	it('registers the webhook, and reports rather than throws on failure', async () => {
		// Without this call a pipeline exists, looks connected, and receives
		// nothing on push.
		const makeRequest = vi.spyOn(service, 'makeRequest').mockResolvedValue({});

		expect(await service.registerWebhook('org', 'demo')).toBe(true);
		expect(makeRequest).toHaveBeenCalledWith('/organizations/org/pipelines/demo/webhook', {
			method: 'POST'
		});

		service.makeRequest.mockRejectedValueOnce(new Error('Buildkite API error: 404 Not Found'));
		expect(await service.registerWebhook('org', 'demo')).toBe(false);
	});

	it('reports whether the pipeline advertises a webhook URL', async () => {
		vi.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({
				json: vi.fn().mockResolvedValue({ provider: { webhook_url: 'https://hook' } })
			})
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue({ provider: {} }) });

		expect(await service.hasWebhook('org', 'demo')).toBe(true);
		expect(await service.hasWebhook('org', 'demo')).toBe(false);
	});

	it('refuses to set an empty configuration', async () => {
		await expect(service.setConfiguration('org', 'demo', '')).rejects.toThrow(
			/empty pipeline configuration/
		);
	});

	it('triggers a build with the commit and branch', async () => {
		const makeRequest = vi
			.spyOn(service, 'makeRequest')
			.mockResolvedValue({ json: vi.fn().mockResolvedValue({ number: 1 }) });

		const build = await service.triggerBuild('org', 'demo', {
			commit: 'abc123',
			branch: 'main',
			message: 'first build'
		});

		expect(build).toEqual({ number: 1 });
		const [endpoint, options] = makeRequest.mock.calls[0];
		expect(endpoint).toBe('/organizations/org/pipelines/demo/builds');
		expect(JSON.parse(options.body)).toEqual({
			commit: 'abc123',
			branch: 'main',
			message: 'first build'
		});
	});

	it('validates the token by requesting its scopes', async () => {
		vi.spyOn(service, 'getAccessToken').mockResolvedValue({ scopes: ['write_pipelines'] });
		expect(await service.validateToken()).toBe(true);

		service.getAccessToken.mockRejectedValue(new Error('bad token'));
		expect(await service.validateToken()).toBe(false);
	});
});
