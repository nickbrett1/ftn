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

var githubFactory;
var circleciFactory;
var dopplerFactory;
var sonarcloudFactory;

vi.mock('../../src/lib/server/github-api.js', () => ({
	GitHubAPIService: (githubFactory = mockServiceFactory('github'))
}));

vi.mock('../../src/lib/server/circleci-api.js', () => ({
	CircleCIAPIService: (circleciFactory = mockServiceFactory('circleci'))
}));

vi.mock('../../src/lib/server/doppler-api.js', () => ({
	DopplerAPIService: (dopplerFactory = mockServiceFactory('doppler'))
}));

vi.mock('../../src/lib/server/sonarcloud-api.js', () => ({
	SonarCloudAPIService: (sonarcloudFactory = mockServiceFactory('sonarcloud'))
}));

import {
	initializeServices,
	validateAllTokens
} from '../../src/lib/server/service-utilities.js';

describe('service-utils', () => {
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
		const results = await validateAllTokens({ github: null }, {});
		expect(results).toEqual({ github: false });
	});
});
