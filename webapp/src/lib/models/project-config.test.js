import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
	getProjectConfiguration: vi.fn(),
	updateProjectConfiguration: vi.fn(),
	createProjectConfiguration: vi.fn(),
	run: vi.fn(),
	query: vi.fn()
}));

const validateProjectConfiguration = vi.hoisted(() => vi.fn(() => ({ valid: true, errors: [] })));

const loggerMock = vi.hoisted(() => ({
	success: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	info: vi.fn()
}));

vi.mock('../server/genproj-database.js', () => ({
	createGenprojDatabase: vi.fn(() => dbMocks),
	genprojDb: dbMocks
}));

const mockDb = dbMocks;

vi.mock('./validation.js', () => ({
	validateProjectConfiguration
}));

vi.mock('$lib/utils/logging.js', () => ({
	logger: loggerMock
}));

import { ProjectConfiguration, ProjectConfigurationManager } from './project-config.js';

describe('ProjectConfiguration', () => {
	beforeEach(() => {
		for (const mockFn of Object.values(dbMocks)) {
			mockFn.mockReset();
		}
		validateProjectConfiguration.mockReset();
		validateProjectConfiguration.mockReturnValue({ valid: true, errors: [] });
		for (const mockFn of Object.values(loggerMock)) {
			mockFn.mockReset();
		}
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('validates configuration using shared validator', () => {
		const config = new ProjectConfiguration(
			{
				id: 'cfg-1',
				projectName: 'Demo',
				repositoryUrl: 'https://example.com/repo',
				selectedCapabilities: ['doppler'],
				configuration: { doppler: {} }
			},
			mockDb
		);

		const result = config.validate();
		expect(result).toEqual({ valid: true, errors: [] });
		expect(validateProjectConfiguration).toHaveBeenCalledWith({
			projectName: 'Demo',
			repositoryUrl: 'https://example.com/repo',
			selectedCapabilities: ['doppler'],
			configuration: { doppler: {} }
		});
	});

	it('updates existing configuration when save is called and record exists', async () => {
		dbMocks.getProjectConfiguration.mockResolvedValue({ id: 'cfg-1' });
		dbMocks.updateProjectConfiguration.mockResolvedValue(true);
		const config = new ProjectConfiguration(
			{
				id: 'cfg-1',
				projectName: 'Updated Project',
				repositoryUrl: 'https://example.com/repo',
				selectedCapabilities: ['circleci'],
				configuration: { circleci: {} },
				status: 'draft'
			},
			mockDb
		);

		const result = await config.save();
		expect(result).toBe(true);
		expect(dbMocks.updateProjectConfiguration).toHaveBeenCalledWith('cfg-1', {
			projectName: 'Updated Project',
			repositoryUrl: 'https://example.com/repo',
			selectedCapabilities: ['circleci'],
			configuration: { circleci: {} },
			status: 'draft'
		});
		expect(loggerMock.success).toHaveBeenCalledWith('Project configuration updated', {
			id: 'cfg-1'
		});
	});

	it('creates new configuration when none exists', async () => {
		dbMocks.getProjectConfiguration.mockResolvedValue(null);
		dbMocks.createProjectConfiguration.mockResolvedValue(true);
		const config = new ProjectConfiguration(
			{
				id: 'cfg-new',
				userId: 'user-1',
				projectName: 'New Project',
				selectedCapabilities: [],
				configuration: {}
			},
			mockDb
		);

		const result = await config.save();
		expect(result).toBe(true);
		expect(dbMocks.createProjectConfiguration).toHaveBeenCalledWith({
			id: 'cfg-new',
			userId: 'user-1',
			projectName: 'New Project',
			repositoryUrl: null,
			selectedCapabilities: [],
			configuration: {},
			status: 'draft'
		});
		expect(loggerMock.success).toHaveBeenCalledWith('Project configuration created', {
			id: 'cfg-new'
		});
	});

	it('returns false if update does not change any records', async () => {
		dbMocks.getProjectConfiguration.mockResolvedValue({ id: 'cfg-1' });
		dbMocks.updateProjectConfiguration.mockResolvedValue(false);
		const config = new ProjectConfiguration({ id: 'cfg-1', projectName: 'Demo' }, mockDb);

		const result = await config.save();
		expect(result).toBe(false);
		expect(loggerMock.success).not.toHaveBeenCalled();
	});

	it('throws and logs error when validation fails on save', async () => {
		validateProjectConfiguration.mockReturnValue({ valid: false, errors: ['bad data'] });
		const config = new ProjectConfiguration({ id: 'cfg-err', projectName: 'Invalid' }, mockDb);

		await expect(config.save()).rejects.toThrow(/Validation failed/);
		expect(loggerMock.error).toHaveBeenCalledWith('Failed to save project configuration', {
			id: 'cfg-err',
			error: expect.stringContaining('Validation failed')
		});
	});

	it('loads configuration from database when present', async () => {
		dbMocks.getProjectConfiguration.mockResolvedValue({ id: 'cfg-1', projectName: 'Loaded' });

		const config = await ProjectConfiguration.load('cfg-1', mockDb);
		expect(config).toBeInstanceOf(ProjectConfiguration);
		expect(config.projectName).toBe('Loaded');
	});

	it('returns null when configuration missing during load', async () => {
		dbMocks.getProjectConfiguration.mockResolvedValue(null);
		const config = await ProjectConfiguration.load('missing', mockDb);
		expect(config).toBeNull();
	});

	it('logs and rethrows errors when load fails', async () => {
		dbMocks.getProjectConfiguration.mockRejectedValue(new Error('d1 down'));
		await expect(ProjectConfiguration.load('cfg-1', mockDb)).rejects.toThrow('d1 down');
		expect(loggerMock.error).toHaveBeenCalledWith('Failed to load project configuration', {
			id: 'cfg-1',
			error: 'd1 down'
		});
	});

	it('deletes configuration and related data', async () => {
		dbMocks.run
			.mockResolvedValueOnce({ changes: 1 }) // delete from generated_artifacts
			.mockResolvedValueOnce({ changes: 1 }) // delete from external_service_integrations
			.mockResolvedValueOnce({ changes: 1 }); // delete configuration

		const config = new ProjectConfiguration({ id: 'cfg-del' }, mockDb);
		const result = await config.delete();

		expect(result).toBe(true);
		expect(dbMocks.run).toHaveBeenNthCalledWith(
			1,
			'DELETE FROM generated_artifacts WHERE project_config_id = ?',
			['cfg-del']
		);
		expect(dbMocks.run).toHaveBeenNthCalledWith(
			2,
			'DELETE FROM external_service_integrations WHERE project_config_id = ?',
			['cfg-del']
		);
		expect(loggerMock.success).toHaveBeenCalledWith('Project configuration deleted', {
			id: 'cfg-del'
		});
	});

	it('returns false when delete affects no rows', async () => {
		dbMocks.run
			.mockResolvedValueOnce({ changes: 1 })
			.mockResolvedValueOnce({ changes: 1 })
			.mockResolvedValueOnce({ changes: 0 });

		const config = new ProjectConfiguration({ id: 'cfg-none' }, mockDb);
		const result = await config.delete();
		expect(result).toBe(false);
	});

	it('throws when deleteRelatedData encounters errors', async () => {
		dbMocks.run.mockRejectedValue(new Error('delete failed'));
		const config = new ProjectConfiguration({ id: 'cfg-error' }, mockDb);

		await expect(config.deleteRelatedData()).rejects.toThrow('delete failed');
		expect(loggerMock.error).toHaveBeenCalledWith('Failed to delete related data', {
			id: 'cfg-error',
			error: 'delete failed'
		});
	});

	it('updates status when valid value provided', async () => {
		dbMocks.updateProjectConfiguration.mockResolvedValue(true);
		const config = new ProjectConfiguration({ id: 'cfg-status', status: 'draft' }, mockDb);

		const result = await config.updateStatus('preview');
		expect(result).toBe(true);
		expect(config.status).toBe('preview');
		expect(loggerMock.success).toHaveBeenCalledWith('Project status updated', {
			id: 'cfg-status',
			status: 'preview'
		});
	});

	it('throws when updating to an invalid status', async () => {
		const config = new ProjectConfiguration({ id: 'cfg-status' }, mockDb);
		await expect(config.updateStatus('invalid')).rejects.toThrow('Invalid status');
		expect(loggerMock.error).toHaveBeenCalledWith('Failed to update project status', {
			id: 'cfg-status',
			status: 'invalid',
			error: expect.stringContaining('Invalid status')
		});
	});

	it('handles capability additions and avoids duplicates', async () => {
		const config = new ProjectConfiguration(
			{
				id: 'cfg-cap',
				selectedCapabilities: ['doppler'],
				configuration: { doppler: {} }
			},
			mockDb
		);
		const saveSpy = vi.spyOn(config, 'save').mockResolvedValue(true);

		const duplicate = await config.addCapability('doppler');
		expect(duplicate).toBe(false);
		expect(loggerMock.warn).toHaveBeenCalledWith('Capability already selected', {
			id: 'cfg-cap',
			capabilityId: 'doppler'
		});

		const added = await config.addCapability('circleci', { workflows: 2 });
		expect(added).toBe(true);
		expect(config.configuration.circleci).toEqual({ workflows: 2 });
		expect(saveSpy).toHaveBeenCalledTimes(1);
		expect(loggerMock.success).toHaveBeenCalledWith('Capability added', {
			id: 'cfg-cap',
			capabilityId: 'circleci'
		});
	});

	it('removes capability when present and logs when missing', async () => {
		const config = new ProjectConfiguration(
			{
				id: 'cfg-remove',
				selectedCapabilities: ['doppler'],
				configuration: { doppler: {} }
			},
			mockDb
		);
		const saveSpy = vi.spyOn(config, 'save').mockResolvedValue(true);

		const removed = await config.removeCapability('doppler');
		expect(removed).toBe(true);
		expect(config.configuration.doppler).toBeUndefined();
		expect(loggerMock.success).toHaveBeenCalledWith('Capability removed', {
			id: 'cfg-remove',
			capabilityId: 'doppler'
		});
		expect(saveSpy).toHaveBeenCalledTimes(1);

		loggerMock.success.mockClear();
		saveSpy.mockClear();
		const missing = await config.removeCapability('circleci');
		expect(missing).toBe(false);
		expect(loggerMock.warn).toHaveBeenCalledWith('Capability not found', {
			id: 'cfg-remove',
			capabilityId: 'circleci'
		});
		expect(saveSpy).not.toHaveBeenCalled();
	});

	it('updates capability configuration when capability exists', async () => {
		const config = new ProjectConfiguration(
			{
				id: 'cfg-update',
				selectedCapabilities: ['doppler'],
				configuration: { doppler: {} }
			},
			mockDb
		);
		const saveSpy = vi.spyOn(config, 'save').mockResolvedValue(true);

		const updated = await config.updateCapabilityConfig('doppler', { token: 'abc' });
		expect(updated).toBe(true);
		expect(config.configuration.doppler).toEqual({ token: 'abc' });
		expect(saveSpy).toHaveBeenCalled();
	});

	it('throws when updating config for non-selected capability', async () => {
		const config = new ProjectConfiguration({ id: 'cfg-update', selectedCapabilities: [] }, mockDb);
		await expect(config.updateCapabilityConfig('doppler', {})).rejects.toThrow(
			'Capability not selected'
		);
		expect(loggerMock.error).toHaveBeenCalledWith('Failed to update capability configuration', {
			id: 'cfg-update',
			capabilityId: 'doppler',
			error: expect.stringContaining('Capability not selected')
		});
	});

	it('exposes metadata, summary, and configuration helpers', () => {
		const config = new ProjectConfiguration(
			{
				id: 'cfg-meta',
				userId: 'user-1',
				projectName: 'Meta',
				repositoryUrl: 'repo',
				selectedCapabilities: ['doppler'],
				configuration: { doppler: {} },
				status: 'preview'
			},
			mockDb
		);

		expect(config.getCapabilityConfig('doppler')).toEqual({});
		expect(config.hasCapability('doppler')).toBe(true);
		expect(config.getMetadata()).toMatchObject({
			id: 'cfg-meta',
			userId: 'user-1',
			projectName: 'Meta',
			status: 'preview'
		});
		expect(config.getSummary()).toEqual({
			projectName: 'Meta',
			capabilityCount: 1,
			capabilities: ['doppler'],
			status: 'preview',
			hasRepository: true
		});
	});

	it('clones configuration with draft status and without repository', () => {
		const original = new ProjectConfiguration(
			{
				id: 'cfg-clone',
				projectName: 'Original',
				repositoryUrl: 'repo',
				selectedCapabilities: ['doppler'],
				configuration: { doppler: { key: 'value' } },
				status: 'preview'
			},
			mockDb
		);

		const clone = original.clone('Clone Name');
		expect(clone).toBeInstanceOf(ProjectConfiguration);
		expect(clone.projectName).toBe('Clone Name');
		expect(clone.repositoryUrl).toBeNull();
		expect(clone.status).toBe('draft');
		expect(clone.configuration).toEqual({ doppler: { key: 'value' } });
	});

	it('serialises to JSON and recreates from JSON', () => {
		const config = new ProjectConfiguration(
			{
				id: 'cfg-json',
				projectName: 'JSON Project',
				selectedCapabilities: ['doppler'],
				configuration: { doppler: {} }
			},
			mockDb
		);

		const json = config.toJSON();
		const restored = ProjectConfiguration.fromJSON(json);
		expect(restored).toBeInstanceOf(ProjectConfiguration);
		expect(restored.toJSON()).toEqual(json);
	});
});

describe('ProjectConfigurationManager', () => {
	beforeEach(() => {
		for (const mockFn of Object.values(dbMocks)) {
			mockFn.mockReset();
		}
		validateProjectConfiguration.mockReset();
		validateProjectConfiguration.mockReturnValue({ valid: true, errors: [] });
		for (const mockFn of Object.values(loggerMock)) {
			mockFn.mockReset();
		}
	});

	it('creates configuration via manager and persists it', async () => {
		dbMocks.getProjectConfiguration.mockResolvedValue(null);
		dbMocks.createProjectConfiguration.mockResolvedValue(true);

		const config = await ProjectConfigurationManager.create(
			{
				id: 'cfg-manager',
				projectName: 'Manager Project'
			},
			mockDb
		);

		expect(config).toBeInstanceOf(ProjectConfiguration);
		expect(dbMocks.createProjectConfiguration).toHaveBeenCalled();
	});

	it('loads configuration by id via manager', async () => {
		dbMocks.getProjectConfiguration.mockResolvedValue({ id: 'cfg-1' });
		const result = await ProjectConfigurationManager.getById('cfg-1', mockDb);
		expect(result).toBeInstanceOf(ProjectConfiguration);
	});

	it('returns configurations for a user', async () => {
		dbMocks.query.mockResolvedValue([
			{ id: 'cfg-1', projectName: 'One' },
			{ id: 'cfg-2', projectName: 'Two' }
		]);

		const results = await ProjectConfigurationManager.getByUserId('user-1', mockDb);
		expect(results).toHaveLength(2);
		expect(results[0]).toBeInstanceOf(ProjectConfiguration);
	});

	it('returns configurations by status', async () => {
		dbMocks.query.mockResolvedValue([{ id: 'cfg-1', status: 'preview' }]);
		const results = await ProjectConfigurationManager.getByStatus('preview', mockDb);
		expect(results[0]).toBeInstanceOf(ProjectConfiguration);
		expect(dbMocks.query).toHaveBeenCalledWith(
			'SELECT * FROM project_configurations WHERE status = ? ORDER BY updated_at DESC',
			['preview']
		);
	});

	it('deletes configuration by id when present', async () => {
		const config = new ProjectConfiguration({ id: 'cfg-del' }, mockDb);
		const deleteSpy = vi.spyOn(config, 'delete').mockResolvedValue(true);
		const loadSpy = vi.spyOn(ProjectConfiguration, 'load').mockResolvedValue(config);

		const result = await ProjectConfigurationManager.deleteById('cfg-del', mockDb);
		expect(result).toBe(true);
		expect(loadSpy).toHaveBeenCalledWith('cfg-del', mockDb);
		expect(deleteSpy).toHaveBeenCalled();

		loadSpy.mockRestore();
	});

	it('returns false when deleting non-existent configuration', async () => {
		const loadSpy = vi.spyOn(ProjectConfiguration, 'load').mockResolvedValue(null);
		const result = await ProjectConfigurationManager.deleteById('missing', mockDb);
		expect(result).toBe(false);
		loadSpy.mockRestore();
	});
});
