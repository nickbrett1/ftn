import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCircle, mockDoppler, mockSonar, CircleCIAPIMock, DopplerAPIMock, SonarCloudAPIMock } =
	vi.hoisted(() => {
		const mockCircle = {
			followProject: vi.fn().mockResolvedValue({
				id: 'circle-id',
				slug: 'org/repo',
				organizationSlug: 'org',
				vcsUrl: 'https://github.com/org/repo'
			}),
			createEnvironmentVariable: vi.fn().mockResolvedValue({}),
			validateToken: vi.fn().mockResolvedValue(true)
		};

		const mockDoppler = {
			createProject: vi.fn().mockResolvedValue({ id: 'doppler', slug: 'proj' }),
			createEnvironment: vi.fn().mockResolvedValue({ id: 'env', slug: 'dev' }),
			setSecret: vi.fn().mockResolvedValue({}),
			validateToken: vi.fn().mockResolvedValue(true)
		};

		const mockSonar = {
			createProject: vi.fn().mockResolvedValue({
				key: 'org_repo',
				name: 'Repo',
				organization: 'org',
				visibility: 'public'
			}),
			listQualityGates: vi.fn().mockResolvedValue([{ id: 'gate', isDefault: true }]),
			associateQualityGate: vi.fn().mockResolvedValue({}),
			createWebhook: vi.fn().mockResolvedValue({}),
			validateToken: vi.fn().mockResolvedValue(true)
		};

		return {
			mockCircle,
			mockDoppler,
			mockSonar,
			CircleCIAPIMock: vi.fn(function CircleCIAPIMock() {
				return mockCircle;
			}),
			DopplerAPIMock: vi.fn(function DopplerAPIMock() {
				return mockDoppler;
			}),
			SonarCloudAPIMock: vi.fn(function SonarCloudAPIMock() {
				return mockSonar;
			})
		};
	});

vi.mock('../../src/lib/server/circleci-api.js', () => ({
	CircleCIAPIService: CircleCIAPIMock
}));

vi.mock('../../src/lib/server/doppler-api.js', () => ({
	DopplerAPIService: DopplerAPIMock
}));

vi.mock('../../src/lib/server/sonarcloud-api.js', () => ({
	SonarCloudAPIService: SonarCloudAPIMock
}));

import { ExternalServiceIntegrationService } from '../../src/lib/server/external-service-integration.js';

describe('ExternalServiceIntegrationService', () => {
	const context = {
		projectName: 'Demo',
		repositoryUrl: 'https://github.com/org/repo',
		owner: 'org',
		repo: 'repo',
		authTokens: {},
		configuration: {
			circleci: { environmentVariables: { VAR: 'value' } },
			doppler: { secrets: { dev: { KEY: 'value' } } },
			sonarcloud: { webhookUrl: 'https://hooks', webhookSecret: 'secret' }
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns fallback instructions when tokens missing', async () => {
		const service = new ExternalServiceIntegrationService({});
		const result = await service.integrateCircleCI(context);
		expect(result.success).toBe(false);
		expect(result.fallbackInstructions).toBeDefined();
	});

	it('integrates CircleCI and Doppler successfully', async () => {
		const service = new ExternalServiceIntegrationService({ circleci: 'token', doppler: 'token' });
		const circleci = await service.integrateCircleCI(context);
		expect(circleci.success).toBe(true);
		expect(mockCircle.createEnvironmentVariable).toHaveBeenCalledWith(
			'github',
			'org',
			'repo',
			'VAR',
			'value'
		);

		const doppler = await service.integrateDoppler(context);
		expect(doppler.success).toBe(true);
		expect(mockDoppler.setSecret).toHaveBeenCalledWith(
			'proj',
			'dev',
			'KEY',
			'value',
			expect.stringContaining('genproj')
		);
	});

	it('handles SonarCloud integration with quality gate and webhook', async () => {
		const service = new ExternalServiceIntegrationService({ sonarcloud: 'token' });
		const result = await service.integrateSonarCloud(context);
		expect(result.success).toBe(true);
		expect(mockSonar.listQualityGates).toHaveBeenCalled();
		expect(mockSonar.associateQualityGate).toHaveBeenCalledWith('org_repo', 'gate');
		expect(mockSonar.createWebhook).toHaveBeenCalledWith(
			'org_repo',
			'GitHub Integration',
			'https://hooks',
			'secret'
		);
	});

	it('collects results for integrateAllServices based on capabilities', async () => {
		const service = new ExternalServiceIntegrationService({
			circleci: 'token',
			doppler: 'token',
			sonarcloud: 'token'
		});

		const results = await service.integrateAllServices(context, ['circleci', 'sonarcloud']);

		expect(results.circleci.success).toBe(true);
		expect(results).not.toHaveProperty('doppler');
	});

	it('validates tokens gracefully and reports status', async () => {
		const service = new ExternalServiceIntegrationService({ circleci: 'token' });
		mockCircle.validateToken.mockResolvedValueOnce(true);
		const validation = await service.validateAllTokens();
		expect(validation).toEqual({ circleci: true });

		const status = service.getIntegrationStatus(['circleci', 'doppler']);
		expect(status.status.circleci).toEqual({ available: true, required: true });
		expect(status.missingServices).toEqual(['doppler']);
	});

	it('returns fallback instructions when errors occur', async () => {
		mockCircle.followProject.mockRejectedValueOnce(new Error('boom'));
		const service = new ExternalServiceIntegrationService({ circleci: 'token' });
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = await service.integrateCircleCI(context);
		expect(result.success).toBe(false);
		expect(result.error).toBe('boom');
		expect(spy).toHaveBeenCalledWith('❌ CircleCI integration failed: boom');
	});
});
