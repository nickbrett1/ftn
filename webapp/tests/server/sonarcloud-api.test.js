import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SonarCloudAPIService } from '../../src/lib/server/sonarcloud-api.js';

if (!globalThis.btoa) {
	vi.stubGlobal('btoa', (value) => Buffer.from(value, 'binary').toString('base64'));
}

describe('SonarCloudAPIService', () => {
	let service;

	beforeEach(() => {
		service = new SonarCloudAPIService('token');
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('makes authenticated requests and handles errors', async () => {
		const response = { ok: true, status: 200, statusText: 'OK' };
		fetch.mockResolvedValueOnce(response);
		expect(await service.makeRequest('/ping')).toEqual(response);
		expect(fetch).toHaveBeenCalledWith('https://sonarcloud.io/api/ping', {
			headers: service.headers
		});

		fetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' });
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		await expect(service.makeRequest('/fail')).rejects.toThrow('SonarCloud API error: 500 Error');
		expect(spy).toHaveBeenCalledTimes(2);
	});

	it('validates token and retrieves resources', async () => {
		const jsonValue = { valid: true };
		vi.spyOn(service, 'makeRequest').mockResolvedValue({
			json: vi.fn().mockResolvedValue(jsonValue)
		});
		expect(await service.validateToken()).toBe(true);

		service.makeRequest.mockResolvedValue({ json: vi.fn().mockResolvedValue({ key: 'value' }) });
		expect(await service.getUserInfo()).toEqual({ key: 'value' });
		expect(await service.listOrganizations()).toEqual({ key: 'value' });
	});

	it('creates, updates, and deletes projects', async () => {
		const projectPayload = {
			project: {
				key: 'org_project',
				name: 'Project',
				organization: 'org',
				visibility: 'public',
				qualifier: 'TRK'
			}
		};
		const genericPayload = { ok: true };

		vi.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(projectPayload) })
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(genericPayload) })
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(genericPayload) });

		const project = await service.createProject('org', 'org_project', 'Project');
		expect(project).toMatchObject({ key: 'org_project', name: 'Project' });

		expect(await service.updateProject('org_project', { name: 'Updated' })).toEqual(genericPayload);
		await service.deleteProject('org_project');
		expect(await service.getProject('org_project')).toEqual(genericPayload);
	});

	it('manages quality gates and webhooks', async () => {
		const gatesPayload = { qualitygates: [{ id: '1', isDefault: true }] };
		const webhookPayload = {
			webhook: { key: 'hook', name: 'Hook', url: 'https://example.com', secret: '' }
		};

		vi.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(gatesPayload) })
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue({ qualityGate: {} }) })
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(webhookPayload) })
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue({ webhooks: [] }) })
			.mockResolvedValueOnce({});

		expect(await service.listQualityGates()).toEqual(gatesPayload);
		await service.associateQualityGate('project', '1');
		expect(await service.getProjectQualityGate('project')).toEqual({ qualityGate: {} });

		expect(
			await service.createWebhook('project', 'Hook', 'https://example.com', 'secret')
		).toMatchObject({ key: 'hook' });
		expect(await service.listWebhooks('project')).toEqual({ webhooks: [] });
		await service.deleteWebhook('hook');
	});

	it('retrieves analysis status, triggers analysis, and fetches metrics', async () => {
		const activityPayload = { tasks: [] };
		const triggerPayload = { task: { id: 'task-1' } };
		const metricsPayload = { component: {} };

		vi.spyOn(service, 'makeRequest')
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(activityPayload) })
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(triggerPayload) })
			.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(metricsPayload) });

		expect(await service.getAnalysisStatus('project')).toEqual(activityPayload);
		expect(await service.triggerAnalysis('project', 'main')).toEqual(triggerPayload);
		expect(await service.getProjectMetrics('project', ['coverage'])).toEqual(metricsPayload);
	});
});
