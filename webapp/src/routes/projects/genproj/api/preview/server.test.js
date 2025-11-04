/**
 * @fileoverview Tests for preview API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server.js';
import { capabilities } from '$lib/config/capabilities';

// Mock dependencies
vi.mock('@sveltejs/kit', () => ({
	json: (data, options) => ({
		status: options?.status || 200,
		body: JSON.stringify(data),
		json: async () => data
	}),
	error: (status, message) => ({ status, body: message })
}));

vi.mock('$lib/utils/genproj-errors.js', () => ({
	withErrorHandling: (fn) => fn
}));

vi.mock('$lib/utils/logging.js', () => ({
	logger: {
		error: vi.fn(),
		info: vi.fn()
	}
}));

describe('Preview API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('POST', () => {
		it('should generate a Dockerfile with Docker-in-Docker support when docker capability is selected', async () => {
			const request = {
				json: async () => ({
					projectName: 'test-project',
					selectedCapabilities: ['devcontainer-node', 'docker'],
					configuration: {
						'devcontainer-node': {
							nodeVersion: '22'
						}
					}
				})
			};

			const response = await POST({ request });
			const data = await response.json();

			const dockerfile = data.files.find((f) => f.filePath === '.devcontainer/Dockerfile');
			expect(dockerfile).toBeDefined();
			expect(dockerfile.content).toContain('docker-ce-cli');
		});
	});
});
