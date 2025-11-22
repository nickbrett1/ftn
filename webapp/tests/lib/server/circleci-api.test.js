import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CircleCIAPIService } from '../../../src/lib/server/circleci-api.js';

describe('CircleCIAPIService', () => {
	let service;

	beforeEach(() => {
		service = new CircleCIAPIService('token');
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('makes authenticated requests and handles errors', async () => {
		const successResponse = {
			ok: true,
			status: 200,
			statusText: 'OK'
		};
		fetch.mockResolvedValueOnce(successResponse);
		await expect(service.makeRequest('/ping')).resolves.toEqual(successResponse);
		expect(fetch).toHaveBeenCalledWith('https://circleci.com/api/v2/ping', {
			headers: service.headers
		});

		fetch.mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' });
		await expect(service.makeRequest('/me')).rejects.toThrow(
			'CircleCI API error: 401 Unauthorized'
		);
	});

	it('retrieves user info and organizations', async () => {
		const data = { name: 'user' };
		const json = vi.fn().mockResolvedValue(data);
		vi.spyOn(service, 'makeRequest').mockResolvedValue({ json });

		expect(await service.getUserInfo()).toEqual(data);
		expect(await service.listOrganizations()).toEqual(data);
		expect(json).toHaveBeenCalledTimes(2);
	});

	it('follows and unfollows projects and maps response', async () => {
		const projectPayload = {
			id: '1',
			name: 'Example',
			slug: 'org/example',
			organization_slug: 'org',
			vcs_url: 'https://github.com/org/example',
			vcs_type: 'github'
		};
		const json = vi.fn().mockResolvedValue(projectPayload);
		const makeRequestSpy = vi
			.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({ json })
			.mockResolvedValueOnce({});

		const project = await service.followProject('github', 'org', 'example');
		expect(project).toEqual({
			id: '1',
			name: 'Example',
			slug: 'org/example',
			organizationSlug: 'org',
			vcsUrl: 'https://github.com/org/example',
			vcsType: 'github'
		});

		await service.unfollowProject('github', 'org', 'example');
		expect(makeRequestSpy).toHaveBeenCalledWith(
			'/project/github/org/example/unfollow',
			expect.objectContaining({ method: 'DELETE' })
		);
	});

	it('supports pipeline operations', async () => {
		const listJson = vi.fn().mockResolvedValue({ items: [] });
		const triggerJson = vi.fn().mockResolvedValue({ id: 'pipeline-1' });
		const getJson = vi.fn().mockResolvedValue({ pipeline: {} });

		vi.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({ json: listJson })
			.mockResolvedValueOnce({ json: triggerJson })
			.mockResolvedValueOnce({ json: getJson });

		expect(await service.listPipelines('github', 'org', 'repo', 'token')).toEqual({ items: [] });
		const pipeline = await service.triggerPipeline('github', 'org', 'repo', 'main', {
			flag: true
		});
		expect(pipeline).toEqual({ id: 'pipeline-1' });
		expect(await service.getPipeline('pipeline-1')).toEqual({ pipeline: {} });
	});

	it('manages environment variables', async () => {
		const listJson = vi.fn().mockResolvedValue([{ name: 'VAR' }]);
		const createJson = vi.fn().mockResolvedValue({ name: 'VAR', value: '123' });

		vi.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({ json: listJson })
			.mockResolvedValueOnce({ json: createJson })
			.mockResolvedValueOnce({});

		expect(await service.listEnvironmentVariables('github', 'org', 'repo')).toEqual([
			{
				name: 'VAR'
			}
		]);
		expect(await service.createEnvironmentVariable('github', 'org', 'repo', 'VAR', '123')).toEqual({
			name: 'VAR',
			value: '123'
		});

		await service.deleteEnvironmentVariable('github', 'org', 'repo', 'VAR');
	});

	it('validates token by checking user info', async () => {
		vi.spyOn(service, 'getUserInfo').mockResolvedValue({});
		expect(await service.validateToken()).toBe(true);

		service.getUserInfo.mockRejectedValue(new Error('bad token'));
		expect(await service.validateToken()).toBe(false);
	});
});