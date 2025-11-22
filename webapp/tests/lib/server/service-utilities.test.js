import { describe, it, expect, vi, beforeEach } from 'vitest';

function mockServiceFactory(name) {
	const validateToken = vi.fn().mockResolvedValue(true);

	return vi.fn(function (token) {
		return {
			token,
			name,
			validateToken
		};
	});
}

const githubFactory = mockServiceFactory('github');
const circleciFactory = mockServiceFactory('circleci');
const dopplerFactory = mockServiceFactory('doppler');
const sonarcloudFactory = mockServiceFactory('sonarcloud');

vi.doMock('../../../src/lib/server/github-api.js', () => ({
	GitHubAPIService: githubFactory
}));

vi.doMock('../../../src/lib/server/circleci-api.js', () => ({
	CircleCIAPIService: circleciFactory
}));

vi.doMock('../../../src/lib/server/doppler-api.js', () => ({
	DopplerAPIService: dopplerFactory
}));

vi.doMock('../../../src/lib/server/sonarcloud-api.js', () => ({
	SonarCloudAPIService: sonarcloudFactory
}));

describe('service-utils', async () => {
	const { initializeServices, validateAllTokens } = await import(
		'../../../src/lib/server/service-utils.js'
	);
	const tokens = {
		github: 'gh',
		circleci: 'cc',
		doppler: 'dp',
		sonarcloud: 'sc'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		githubFactory.mockClear();
		circleciFactory.mockClear();
		dopplerFactory.mockClear();
		sonarcloudFactory.mockClear();
	});

	it('initializes all services when tokens provided', () => {
		const services = initializeServices(tokens);

		expect(Object.keys(services)).toEqual(['github', 'circleci', 'doppler', 'sonarcloud']);
		expect(githubFactory).toHaveBeenCalledWith('gh');
		expect(circleciFactory).toHaveBeenCalledWith('cc');
		expect(dopplerFactory).toHaveBeenCalledWith('dp');
		expect(sonarcloudFactory).toHaveBeenCalledWith('sc');
	});

	it('respects allowed services filter', () => {
		const services = initializeServices(tokens, ['github', 'doppler']);

		expect(Object.keys(services)).toEqual(['github', 'doppler']);
		expect(githubFactory).toHaveBeenCalledTimes(1);
		expect(dopplerFactory).toHaveBeenCalledTimes(1);
		expect(circleciFactory).not.toHaveBeenCalled();
		expect(sonarcloudFactory).not.toHaveBeenCalled();
	});

	it('validates all tokens and handles failures', async () => {
		const services = initializeServices(tokens);
		services.github.validateToken = vi.fn().mockResolvedValue(true);
		services.circleci.validateToken = vi.fn().mockRejectedValue(new Error('bad token'));
		services.doppler.validateToken = vi.fn().mockResolvedValue(false);
		services.sonarcloud.validateToken = vi.fn().mockResolvedValue(true);

		const results = await validateAllTokens(tokens, services);

		expect(results).toEqual({
			github: true,
			circleci: false,
			doppler: false,
			sonarcloud: true
		});
	});

	it('marks services without tokens as invalid', async () => {
		const results = await validateAllTokens({ github: undefined }, {});
		expect(results).toEqual({ github: false });
	});
});