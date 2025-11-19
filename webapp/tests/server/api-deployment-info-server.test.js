import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, OPTIONS } from '../../src/routes/api/deployment-info/+server.js';

describe('/api/deployment-info', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	describe('GET', () => {
		it('should return the deployment info', async () => {
			vi.stubGlobal('__BUILD_TIME__', '2024-01-15T10:30:00.000Z');
			vi.stubGlobal('__GIT_BRANCH__', 'main');
			vi.stubGlobal('__GIT_COMMIT__', 'abc1234');

			const response = await GET();
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.buildTime).toBe('2024-01-15T10:30:00.000Z');
			expect(body.gitBranch).toBe('main');
			expect(body.gitCommit).toBe('abc1234');
		});

		it('should handle missing build-time constants', async () => {
			vi.stubGlobal('__BUILD_TIME__', undefined);
			vi.stubGlobal('__GIT_BRANCH__', undefined);
			vi.stubGlobal('__GIT_COMMIT__', undefined);

			const response = await GET();
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.buildTime).toBe(null);
			expect(body.gitBranch).toBe(null);
			expect(body.gitCommit).toBe(null);
		});
	});

	describe('OPTIONS', () => {
		it('should return a 200 response', async () => {
			const response = await OPTIONS();
			expect(response.status).toBe(200);
		});
	});
});
