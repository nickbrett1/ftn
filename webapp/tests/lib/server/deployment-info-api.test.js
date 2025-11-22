import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, OPTIONS } from '../../../src/routes/api/deployment-info/+server.js';

describe('deployment-info api', () => {
	beforeEach(() => {
		vi.stubGlobal('__BUILD_TIME__', '2024-01-01T00:00:00.000Z');
		vi.stubGlobal('__GIT_BRANCH__', 'main');
		vi.stubGlobal('__GIT_COMMIT__', 'abc1234');
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('GET returns deployment info', async () => {
		const response = await GET();
		const data = await response.json();

		expect(data).toEqual({
			buildTime: '2024-01-01T00:00:00.000Z',
			gitBranch: 'main',
			gitCommit: 'abc1234',
			environment: 'production',
			lastUpdated: '2024-01-01T00:00:00.000Z'
		});
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('GET handles missing globals', async () => {
		vi.stubGlobal('__BUILD_TIME__', undefined);
		vi.stubGlobal('__GIT_BRANCH__', undefined);
		vi.stubGlobal('__GIT_COMMIT__', undefined);

		const response = await GET();
		const data = await response.json();

		expect(data.buildTime).toBeNull();
		expect(data.gitBranch).toBeNull();
		expect(data.gitCommit).toBeNull();
	});

	it('OPTIONS returns CORS headers', async () => {
		const response = await OPTIONS();
		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
	});
});