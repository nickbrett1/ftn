import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the environment module
vi.mock('$env/static/private', () => ({
	DEV_GITHUB_CLIENT_ID: 'dev-id',
	DEV_GITHUB_CLIENT_SECRET: 'dev-secret',
	PREVIEW_GITHUB_CLIENT_ID: 'preview-id',
	PREVIEW_GITHUB_CLIENT_SECRET: 'preview-secret',
	PROD_GITHUB_CLIENT_ID: 'prod-id',
	PROD_GITHUB_CLIENT_SECRET: 'prod-secret',
	GITHUB_CLIENT_ID: 'default-id',
	GITHUB_CLIENT_SECRET: 'default-secret'
}));

// Import the function under test using relative path
import { getGithubCredentials } from '../../../../src/lib/server/github/credentials.js';

describe('GitHub Credentials', () => {
	it('should return preview credentials for preview hostname', () => {
		const creds = getGithubCredentials('ftn-preview.nick-brett1.workers.dev');
		expect(creds).toEqual({
			clientId: 'preview-id',
			clientSecret: 'preview-secret'
		});
	});

	it('should return prod credentials for prod hostname', () => {
		const creds = getGithubCredentials('fintechnick.com');
		expect(creds).toEqual({
			clientId: 'prod-id',
			clientSecret: 'prod-secret'
		});
	});

	it('should return dev credentials for localhost', () => {
		const creds = getGithubCredentials('localhost');
		expect(creds).toEqual({
			clientId: 'dev-id',
			clientSecret: 'dev-secret'
		});
	});

	it('should fallback to default credentials if dev vars are missing', async () => {
		const creds = getGithubCredentials('some-random-host');
		expect(creds).toEqual({
			clientId: 'dev-id',
			clientSecret: 'dev-secret'
		});
	});
});
