import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GenprojDatabase } from '../../src/lib/server/genproj-database.js';

describe('GenprojDatabase', () => {
	let mockDb;
	let mockPlatform;
	let db;
	const now = '2024-01-01T00:00:00.000Z';

	const createStatement = ({ all, first, run } = {}) => ({
		bind: vi.fn().mockReturnThis(),
		all: all || vi.fn(),
		first: first || vi.fn(),
		run: run || vi.fn()
	});

	beforeEach(() => {
		mockDb = {
			prepare: vi.fn()
		};
		mockPlatform = { env: { DB_GENPROJ: mockDb } };
		db = new GenprojDatabase(mockPlatform);
		vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('uuid-123');
		vi.useFakeTimers().setSystemTime(new Date(now));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('fails initialization when database is missing', async () => {
		const emptyPlatform = { env: { DB_GENPROJ: null } };
		db = new GenprojDatabase(emptyPlatform);
		const result = await db.initialize();
		expect(result).toBe(false);
	});

	it('initializes successfully when test query passes', async () => {
		const stmt = createStatement({ first: vi.fn().mockResolvedValue(1) });
		mockDb.prepare.mockReturnValue(stmt);

		const result = await db.initialize();
		expect(result).toBe(true);
		expect(stmt.first).toHaveBeenCalled();
	});

	it('executes query helpers', async () => {
		const stmtAll = createStatement({ all: vi.fn().mockResolvedValue([{ id: 1 }]) });
		const stmtFirst = createStatement({ first: vi.fn().mockResolvedValue({ id: 1 }) });
		const stmtRun = createStatement({ run: vi.fn().mockResolvedValue({ changes: 1 }) });

		mockDb.prepare
			.mockReturnValueOnce(stmtAll)
			.mockReturnValueOnce(stmtFirst)
			.mockReturnValueOnce(stmtRun);

		expect(await db.query('SELECT * FROM table')).toEqual([{ id: 1 }]);
		expect(await db.queryFirst('SELECT * FROM table')).toEqual({ id: 1 });
		expect(await db.run('UPDATE table')).toEqual({ changes: 1 });
	});

	it('handles project configuration lifecycle', async () => {
		const insertStmt = createStatement({ run: vi.fn().mockResolvedValue({ changes: 1 }) });
		const selectStmt = createStatement({
			first: vi.fn().mockResolvedValue({
				id: 'uuid-123',
				user_id: 'user',
				project_name: 'Demo',
				repository_url: null,
				selected_capabilities: '[]',
				configuration: '{}'
			})
		});
		const updateStmt = createStatement({ run: vi.fn().mockResolvedValue({ changes: 1 }) });

		mockDb.prepare
			.mockReturnValueOnce(insertStmt)
			.mockReturnValueOnce(selectStmt)
			.mockReturnValueOnce(updateStmt);

		const configId = await db.createProjectConfiguration({
			userId: 'user',
			projectName: 'Demo',
			selectedCapabilities: [],
			configuration: {}
		});

		expect(configId).toBe('uuid-123');
		const config = await db.getProjectConfiguration('uuid-123');
		expect(config).toMatchObject({ project_name: 'Demo', selectedCapabilities: [] });

		await db.updateProjectConfiguration('uuid-123', {
			projectName: 'Updated',
			status: 'ready'
		});
		const updateSql = mockDb.prepare.mock.calls.at(-1)[0];
		expect(updateSql).toContain('updated_at');
	});

	it('manages authentication state records', async () => {
		const insertStmt = createStatement({ run: vi.fn().mockResolvedValue({ changes: 1 }) });
		const selectStmt = createStatement({
			first: vi.fn().mockResolvedValue({
				user_id: 'user',
				google_auth: '{}',
				github_auth: null,
				circleci_auth: null,
				doppler_auth: null,
				sonarcloud_auth: null,
				last_updated: now
			})
		});
		const updateStmt = createStatement({ run: vi.fn().mockResolvedValue({ changes: 1 }) });

		mockDb.prepare
			.mockReturnValueOnce(insertStmt)
			.mockReturnValueOnce(selectStmt)
			.mockReturnValueOnce(updateStmt);

		expect(
			await db.createAuthenticationState('user', {
				google: { authenticated: true }
			})
		).toBe(true);

		const state = await db.getAuthenticationState('user');
		expect(state).toMatchObject({ userId: 'user', google: {} });

		expect(
			await db.updateAuthenticationState('user', {
				github: { authenticated: true }
			})
		).toBe(true);
	});

	it('stores generated artifacts and integrations', async () => {
		const artifactInsert = createStatement({ run: vi.fn().mockResolvedValue({ changes: 1 }) });
		const artifactSelect = createStatement({
			all: vi.fn().mockResolvedValue([
				{
					id: 'uuid-123',
					project_config_id: 'config',
					capability_id: 'feature',
					file_path: 'README.md',
					content: 'content',
					template_id: 'tpl',
					variables: '{}',
					is_executable: 0,
					created_at: now
				}
			])
		});
		const integrationInsert = createStatement({ run: vi.fn().mockResolvedValue({ changes: 1 }) });
		const integrationSelect = createStatement({
			all: vi.fn().mockResolvedValue([
				{
					id: 'uuid-123',
					project_config_id: 'config',
					service_id: 'github',
					status: 'completed',
					service_project_id: 'repo',
					configuration: '{}',
					error_message: null,
					created_at: now,
					completed_at: now
				}
			])
		});

		mockDb.prepare
			.mockReturnValueOnce(artifactInsert)
			.mockReturnValueOnce(artifactSelect)
			.mockReturnValueOnce(integrationInsert)
			.mockReturnValueOnce(integrationSelect);

		const artifactId = await db.createGeneratedArtifact({
			projectConfigId: 'config',
			capabilityId: 'feature',
			filePath: 'README.md',
			content: 'content',
			templateId: 'tpl',
			variables: {},
			isExecutable: false
		});

		expect(artifactId).toBe('uuid-123');
		expect(await db.getGeneratedArtifacts('config')).toHaveLength(1);

		const integrationId = await db.createExternalServiceIntegration({
			projectConfigId: 'config',
			serviceId: 'github',
			status: 'completed',
			configuration: {}
		});

		expect(integrationId).toBe('uuid-123');
		expect(await db.getExternalServiceIntegrations('config')).toHaveLength(1);
	});
});
