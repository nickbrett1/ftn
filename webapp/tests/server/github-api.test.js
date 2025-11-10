import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GitHubAPIService } from '../../src/lib/server/github-api.js';

describe('GitHubAPIService', () => {
	let service;

	beforeEach(() => {
		service = new GitHubAPIService('token');
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('makes authenticated requests and handles failures', async () => {
		const response = { ok: true, status: 200, statusText: 'OK' };
		fetch.mockResolvedValueOnce(response);
		expect(await service.makeRequest('/user')).toEqual(response);
		expect(fetch).toHaveBeenCalledWith('https://api.github.com/user', {
			headers: service.headers
		});

		fetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
		await expect(service.makeRequest('/missing')).rejects.toThrow(
			'GitHub API error: 404 Not Found'
		);
	});

	it('retrieves user info and creates repositories', async () => {
		const userData = { login: 'user' };
		const repoPayload = {
			name: 'repo',
			full_name: 'user/repo',
			clone_url: 'clone',
			html_url: 'html',
			private: false
		};

		vi.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(userData) }) // getUserInfo
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(repoPayload) }); // createRepository

		expect(await service.getUserInfo()).toEqual(userData);
		expect(await service.createRepository('repo', 'desc')).toMatchObject({
			fullName: 'user/repo',
			htmlUrl: 'html'
		});
	});

	it('checks repository existence', async () => {
		const spy = vi.spyOn(service, 'makeRequest');
		spy.mockResolvedValueOnce({});
		expect(await service.repositoryExists('user', 'repo')).toBe(true);

		spy.mockRejectedValueOnce(new Error('GitHub API error: 404 Not Found'));
		expect(await service.repositoryExists('user', 'repo')).toBe(false);
	});

	it('creates or updates files with existing sha detection', async () => {
		const getFileJson = vi.fn().mockResolvedValue({ sha: 'abc123' });
		const putJson = vi.fn().mockResolvedValue({ content: { path: 'README.md' } });

		vi.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({ json: getFileJson })
			.mockResolvedValueOnce({ json: putJson });

		const result = await service.createOrUpdateFile('user', 'repo', {
			path: 'README.md',
			content: 'Hello',
			message: 'Update README'
		});

		expect(result).toEqual({ content: { path: 'README.md' } });
		const [, options] = service.makeRequest.mock.calls.at(-1);
		expect(JSON.parse(options.body)).toMatchObject({
			message: 'Update README',
			branch: 'main',
			sha: 'abc123'
		});

		// New file path should omit sha
		service.makeRequest.mockReset();
		vi.spyOn(service, 'makeRequest')
			.mockRejectedValueOnce(new Error('GitHub API error: 404 Not Found'))
			.mockResolvedValueOnce({ json: putJson });

		await service.createOrUpdateFile('user', 'repo', {
			path: 'LICENSE',
			content: 'MIT',
			message: 'Add LICENSE'
		});
		const [, newOptions] = service.makeRequest.mock.calls.at(-1);
		expect(JSON.parse(newOptions.body)).not.toHaveProperty('sha');
	});

	it('creates multiple files in a single commit', async () => {
		const referenceJson = vi.fn().mockResolvedValue({ object: { sha: 'ref-sha' } });
		const commitJson = vi.fn().mockResolvedValue({ tree: { sha: 'tree-sha' } });
		const treeJson = vi.fn().mockResolvedValue({ sha: 'new-tree' });
		const newCommitJson = vi.fn().mockResolvedValue({ sha: 'commit-sha' });

		vi.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({ json: referenceJson })
			.mockResolvedValueOnce({ json: commitJson })
			.mockResolvedValueOnce({ json: treeJson })
			.mockResolvedValueOnce({ json: newCommitJson })
			.mockResolvedValueOnce({});

		const commit = await service.createMultipleFiles(
			'user',
			'repo',
			[
				{
					path: 'file.txt',
					content: 'content'
				}
			],
			'Initial commit'
		);

		expect(commit).toEqual({ sha: 'commit-sha' });
		const patchCall = service.makeRequest.mock.calls.at(-1);
		expect(patchCall[0]).toBe('/repos/user/repo/git/refs/heads/main');
	});

	it('creates webhooks, lists repos and deletes repository', async () => {
		const webhookJson = vi.fn().mockResolvedValue({ id: 1 });
		const reposJson = vi.fn().mockResolvedValue([{ name: 'repo' }]);

		vi.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({ json: webhookJson })
			.mockResolvedValueOnce({ json: reposJson })
			.mockResolvedValueOnce({});

		expect(await service.createWebhook('user', 'repo', 'https://example.com', ['push'])).toEqual({
			id: 1
		});
		expect(await service.listRepositories('all', 'updated', 5)).toEqual([{ name: 'repo' }]);

		await service.deleteRepository('user', 'repo');
	});

	it('retrieves repositories and validates token', async () => {
		const repoJson = vi.fn().mockResolvedValue({ name: 'repo' });
		vi.spyOn(service, 'makeRequest').mockResolvedValue({ json: repoJson });

		expect(await service.getRepository('user', 'repo')).toEqual({ name: 'repo' });
		expect(await service.validateToken()).toBe(true);

		service.makeRequest.mockReset();
		vi.spyOn(service, 'getUserInfo').mockRejectedValue(new Error('bad token'));
		expect(await service.validateToken()).toBe(false);
	});
});
