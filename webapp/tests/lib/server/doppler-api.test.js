import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { DopplerAPIService } from '../../../src/lib/server/doppler-api.js';

describe('DopplerAPIService', () => {
	let service;

	beforeEach(() => {
		service = new DopplerAPIService('token');
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('makes authenticated requests and throws on failure', async () => {
		const response = { ok: true, status: 200, statusText: 'OK' };
		fetch.mockResolvedValueOnce(response);
		expect(await service.makeRequest('/me')).toEqual(response);
		expect(fetch).toHaveBeenCalledWith('https://api.doppler.com/v3/me', {
			headers: service.headers
		});

		fetch.mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' });
		await expect(service.makeRequest('/fail')).rejects.toThrow('Doppler API error: 403 Forbidden');
	});

	it('supports basic CRUD operations for projects', async () => {
		const projectPayload = {
			id: 'proj',
			name: 'Project',
			slug: 'project',
			description: 'desc',
			created_at: 'now'
		};
		const jsonProject = vi.fn().mockResolvedValue(projectPayload);
		const jsonGeneric = vi.fn().mockResolvedValue({ ok: true });

		vi.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({ json: jsonProject }) // createProject
			.mockResolvedValueOnce({ json: jsonGeneric }) // getProject
			.mockResolvedValueOnce({ json: jsonGeneric }) // updateProject
			.mockResolvedValueOnce({}); // deleteProject

		const project = await service.createProject('Project', 'desc');
		expect(project).toMatchObject({ id: 'proj', name: 'Project', slug: 'project' });

		expect(await service.getProject('project')).toEqual({ ok: true });
		expect(await service.updateProject('project', { description: 'new' })).toEqual({ ok: true });

		await service.deleteProject('project');
	});

	it('lists projects with pagination parameters', async () => {
		const json = vi.fn().mockResolvedValue({ data: [] });
		vi.spyOn(service, 'makeRequest').mockResolvedValue({ json });

		expect(await service.listProjects(2, 10)).toEqual({ data: [] });
		expect(service.makeRequest).toHaveBeenCalledWith('/projects?page=2&per_page=10');
	});

	it('manages environments and secrets', async () => {
		const environmentPayload = {
			id: 'env',
			name: 'Dev',
			slug: 'dev',
			project_id: 'proj'
		};
		const jsonEnvironments = vi.fn().mockResolvedValue([{ id: 'env' }]);
		const jsonEnvironment = vi.fn().mockResolvedValue(environmentPayload);
		const jsonSecrets = vi.fn().mockResolvedValue([{ name: 'TOKEN' }]);
		const jsonSecret = vi.fn().mockResolvedValue({ name: 'TOKEN', value: '123' });

		vi.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({ json: jsonEnvironments })
			.mockResolvedValueOnce({ json: jsonEnvironment })
			.mockResolvedValueOnce({ json: jsonSecrets })
			.mockResolvedValueOnce({ json: jsonSecret })
			.mockResolvedValueOnce({});

		expect(await service.listEnvironments('proj')).toEqual([{ id: 'env' }]);
		expect(await service.createEnvironment('proj', 'Dev', 'dev')).toMatchObject({ slug: 'dev' });
		expect(await service.listSecrets('proj', 'dev')).toEqual([{ name: 'TOKEN' }]);
		expect(await service.setSecret('proj', 'dev', 'TOKEN', '123', 'comment')).toMatchObject({
			name: 'TOKEN'
		});

		await service.deleteSecret('proj', 'dev', 'TOKEN');
	});

	it('retrieves activity logs and validates tokens', async () => {
		const json = vi.fn().mockResolvedValue({ logs: [] });
		vi.spyOn(service, 'makeRequest').mockResolvedValue({ json });

		expect(await service.getActivityLogs('proj', 3, 5)).toEqual({ logs: [] });
		expect(service.makeRequest).toHaveBeenCalledWith('/projects/proj/activity?page=3&per_page=5');

		vi.spyOn(service, 'getUserInfo').mockResolvedValue({});
		expect(await service.validateToken()).toBe(true);
		service.getUserInfo.mockRejectedValue(new Error('bad token'));
		expect(await service.validateToken()).toBe(false);
	});
});
