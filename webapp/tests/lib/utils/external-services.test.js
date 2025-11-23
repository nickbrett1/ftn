import { describe, it, expect } from 'vitest';

import {
	serviceConfigs,
	getServiceConfig,
	getServiceNames,
	requiresOAuth,
	getOAuthConfig,
	getApiTokenConfig,
	getEnvVarName,
	validateServiceConfig,
	getRateLimitConfig
} from '$lib/config/external-services.js';

describe('external service configuration helpers', () => {
	it('exposes all service configurations and names', () => {
		const names = getServiceNames();
		expect(names).toEqual(Object.keys(serviceConfigs));
		for (const name of names) {
			expect(getServiceConfig(name)).toEqual(serviceConfigs[name]);
		}
	});

	it('detects OAuth and API token requirements', () => {
		expect(requiresOAuth('github')).toBe(true);
		expect(requiresOAuth('circleci')).toBe(false);
		expect(getOAuthConfig('github')).toMatchObject({ type: 'oauth2' });
		expect(getApiTokenConfig('doppler')).toMatchObject({ type: 'api_token' });
		expect(getOAuthConfig('circleci')).toBeUndefined();
		expect(getApiTokenConfig('github')).toBeUndefined();
	});

	it('returns environment variable names and rate limit configs', () => {
		expect(getEnvVarName('github', 'clientId')).toBe('GITHUB_CLIENT_ID');
		expect(getEnvVarName('doppler', 'apiToken')).toBe('DOPPLER_API_TOKEN');
		expect(getEnvVarName('unknown', 'apiToken')).toBeUndefined();
		expect(getRateLimitConfig('github')).toMatchObject({ max: 5000 });
		expect(getRateLimitConfig('unknown')).toEqual(getRateLimitConfig('default'));
	});

	it('validates configurations for known services and reports errors', () => {
		const githubConfig = {
			name: serviceConfigs.github.name,
			baseUrl: serviceConfigs.github.baseUrl,
			auth: { clientId: 'id', clientSecret: 'secret' }
		};
		expect(validateServiceConfig('github', githubConfig)).toEqual({ valid: true, errors: [] });

		const dopplerConfig = {
			name: 'Doppler',
			baseUrl: serviceConfigs.doppler.baseUrl,
			auth: { apiToken: 'token' }
		};
		expect(validateServiceConfig('doppler', dopplerConfig)).toEqual({ valid: true, errors: [] });

		const invalid = validateServiceConfig('github', {
			name: 'Nope',
			baseUrl: 'https://bad.example'
		});
		expect(invalid.valid).toBe(false);
		expect(invalid.errors).toContain('Invalid service name');
		expect(invalid.errors).toContain('OAuth2 requires clientId and clientSecret');

		const unknown = validateServiceConfig('made-up', {});
		expect(unknown).toEqual({ valid: false, error: 'Unknown service: made-up' });
	});
});
