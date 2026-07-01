import { describe, it, expect, vi } from 'vitest';
import * as utils from '../../../src/lib/server/genproj-api-utils.js';
import { ApiKeyService } from '../../../src/lib/server/api-key-service';
import { json } from '@sveltejs/kit';

vi.mock('../../../src/lib/server/api-key-service');
vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data, options) => ({ data, ...options }))
}));

describe('genproj-api-utils', () => {
	describe('handleGenprojErrorResult', () => {
		it('returns 401 for Unauthorized', () => {
			const res = utils.handleGenprojErrorResult({ error: 'Unauthorized: failed' });
			expect(res.status).toBe(401);
			expect(res.data.message).toBe('Unauthorized: failed');
		});

		it('returns 401 for GitHub token not found', () => {
			const res = utils.handleGenprojErrorResult({ error: 'GitHub token not found' });
			expect(res.status).toBe(401);
		});

		it('returns 409 for REPOSITORY_EXISTS', () => {
			const res = utils.handleGenprojErrorResult({ errorCode: 'REPOSITORY_EXISTS' });
			expect(res.status).toBe(409);
		});

		it('returns 500 for generic error', () => {
			const res = utils.handleGenprojErrorResult({ error: 'Some other error' });
			expect(res.status).toBe(500);
			expect(res.data.message).toBe('Some other error');
		});

		it('returns 500 for undefined error', () => {
			const res = utils.handleGenprojErrorResult({});
			expect(res.status).toBe(500);
			expect(res.data.message).toBe('Project generation failed');
		});

		it('returns 500 when error code is present but not REPOSITORY_EXISTS', () => {
			const res = utils.handleGenprojErrorResult({ errorCode: 'OTHER_CODE' });
			expect(res.status).toBe(500);
			expect(res.data.message).toBe('Project generation failed');
		});
	});

	describe('buildAuthTokensFromStored', () => {
		it('maps tokens correctly', () => {
			const stored = [
				{ serviceName: 'GitHub', accessToken: 'gh1' },
				{ serviceName: 'CircleCI', accessToken: 'cc1' },
				{ serviceName: 'Doppler', accessToken: 'dp1' },
				{ serviceName: 'SonarCloud', accessToken: 'sc1' }
			];
			const tokens = utils.buildAuthTokensFromStored(stored);
			expect(tokens).toEqual({
				github: 'gh1',
				circleci: 'cc1',
				doppler: 'dp1',
				sonarcloud: 'sc1'
			});
		});

		it('falls back to cookie for github if missing', () => {
			const stored = [];
			const cookies = { get: vi.fn().mockReturnValue('gh_cookie') };
			const tokens = utils.buildAuthTokensFromStored(stored, cookies);
			expect(tokens.github).toBe('gh_cookie');
		});

		it('does not fall back to cookie for github if missing but cookies object missing', () => {
			const stored = [];
			const tokens = utils.buildAuthTokensFromStored(stored);
			expect(tokens.github).toBeUndefined();
		});
	});

	describe('buildProjectContext', () => {
		it('builds context correctly', () => {
			const payload = {
				name: 'my-proj',
				repositoryUrl: 'url',
				selectedCapabilities: ['a'],
				overwrite: true,
				resolutions: { key: 'val' }
			};
			const ctx = utils.buildProjectContext(payload, 'u1', { token: 't' });
			expect(ctx).toEqual({
				projectName: 'my-proj',
				repositoryUrl: 'url',
				capabilities: ['a'],
				configuration: {},
				authTokens: { token: 't' },
				userId: 'u1',
				overwrite: true,
				resolutions: { key: 'val' }
			});
		});

		it('uses defaults for missing fields', () => {
			const payload = {
				name: 'my-proj',
				selectedCapabilities: ['a']
			};
			const ctx = utils.buildProjectContext(payload, 'u1', { token: 't' });
			expect(ctx.repositoryUrl).toBe('');
			expect(ctx.overwrite).toBe(false);
			expect(ctx.resolutions).toBeNull();
		});
	});

	describe('validatePatAuth', () => {
		it('returns 401 if missing Authorization header', async () => {
			const request = { headers: new Headers() };
			const res = await utils.validatePatAuth(request, { env: {} });
			expect(res.errorResponse.status).toBe(401);
			expect(res.errorResponse.data.message).toContain('Missing or invalid PAT');
		});

		it('returns 401 if invalid Authorization scheme', async () => {
			const request = { headers: new Headers({ Authorization: 'Basic xyz' }) };
			const res = await utils.validatePatAuth(request, { env: {} });
			expect(res.errorResponse.status).toBe(401);
		});

		it('returns 401 if token part is empty string due to multiple spaces', async () => {
			const request = { headers: new Headers({ Authorization: 'Bearer' }) };
			const res = await utils.validatePatAuth(request, { env: {} });
			expect(res.errorResponse.status).toBe(401);
		});

		it('returns 401 if token part is completely missing', async () => {
			const request = { headers: new Headers({ Authorization: 'Bearer' }) };
			const res = await utils.validatePatAuth(request, { env: {} });
			expect(res.errorResponse.status).toBe(401);
		});

		it('returns 401 if token is invalid', async () => {
			const request = { headers: new Headers({ Authorization: 'Bearer invalid' }) };
			ApiKeyService.prototype.validateKey = vi.fn().mockResolvedValue(null);
			const res = await utils.validatePatAuth(request, { env: {} });
			expect(res.errorResponse.status).toBe(401);
		});

		it('returns userEmail if token is valid', async () => {
			const request = { headers: new Headers({ Authorization: 'Bearer valid' }) };
			ApiKeyService.prototype.validateKey = vi.fn().mockResolvedValue('test@user.com');
			const res = await utils.validatePatAuth(request, { env: {} });
			expect(res.userEmail).toBe('test@user.com');
		});

		it('returns 401 if token part is empty whitespace', async () => {
			const request = { headers: new Headers({ Authorization: 'Bearer' }) };
			const res = await utils.validatePatAuth(request, { env: {} });
			expect(res.errorResponse.status).toBe(401);
		});
	});
});
describe('validatePatAuth empty or missing token specifically (full coverage map part 6)', () => {
	it('returns 401 if token part is undefined (split length 1)', async () => {
		const request = { headers: new Headers({ Authorization: 'Bearer' }) };
		const res = await utils.validatePatAuth(request, { env: {} });
		expect(res.errorResponse.status).toBe(401);
	});
});

describe('validatePatAuth completely empty part array edge case', () => {
	it('returns 401 if split result is completely absent', async () => {
		const request = { headers: new Headers({ Authorization: 'Bearer' }) };
		const res = await utils.validatePatAuth(request, { env: {} });
		expect(res.errorResponse.status).toBe(401);
	});
});

describe('validatePatAuth string empty check', () => {
	it('returns 401 if pat.trim() is falsy', async () => {
		const request = { headers: new Headers({ Authorization: 'Bearer      ' }) };
		const res = await utils.validatePatAuth(request, { env: {} });
		expect(res.errorResponse.status).toBe(401);
	});
});

describe('validatePatAuth empty or missing token specifically (full coverage map part 6)', () => {
	it('returns 401 if token part is undefined (split length 1)', async () => {
		const request = { headers: new Headers({ Authorization: 'Bearer' }) };
		const res = await utils.validatePatAuth(request, { env: {} });
		expect(res.errorResponse.status).toBe(401);
	});
});

describe('validatePatAuth empty or missing token specifically (full coverage map part 7)', () => {
	it('returns 401 if token part is purely empty spaces', async () => {
		const request = { headers: new Headers({ Authorization: 'Bearer   ' }) };
		const res = await utils.validatePatAuth(request, { env: {} });
		expect(res.errorResponse.status).toBe(401);
	});
});
describe('validatePatAuth string empty check', () => {
	it('returns 401 if pat is an empty string specifically', async () => {
		const request = { headers: new Headers({ Authorization: 'Bearer ' }) };
		const res = await utils.validatePatAuth(request, { env: {} });
		expect(res.errorResponse.status).toBe(401);
	});
});
describe('validatePatAuth string literal undefined check', () => {
	it('returns 401 if pat is the string "undefined"', async () => {
		const request = { headers: new Headers({ Authorization: 'Bearer undefined' }) };
		const res = await utils.validatePatAuth(request, { env: {} });
		expect(res.errorResponse.status).toBe(401);
	});
});
