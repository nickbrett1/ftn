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
		it('should generate a Dockerfile with Docker-in-Docker support when a devcontainer is selected', async () => {
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

			const devcontainerJson = data.files.find(
				(f) => f.filePath === '.devcontainer/devcontainer.json'
			);
			expect(devcontainerJson).toBeDefined();
			const devcontainerConfig = JSON.parse(devcontainerJson.content);
			expect(devcontainerConfig.features).toHaveProperty(
				'ghcr.io/devcontainers/features/docker-in-docker:2'
			);
		});

		it('should merge devcontainer configurations and include Docker-in-Docker support', async () => {
			const request = {
				json: async () => ({
					projectName: 'test-project',
					selectedCapabilities: ['devcontainer-node', 'devcontainer-python', 'docker'],
					configuration: {
						'devcontainer-node': {
							nodeVersion: '22'
						},
						'devcontainer-python': {
							pythonVersion: '3.12'
						}
					}
				})
			};

			const response = await POST({ request });
			const data = await response.json();

			const devcontainerJson = data.files.find(
				(f) => f.filePath === '.devcontainer/devcontainer.json'
			);
			expect(devcontainerJson).toBeDefined();

			const devcontainerConfig = JSON.parse(devcontainerJson.content);
			expect(devcontainerConfig.features).toHaveProperty(
				'ghcr.io/devcontainers/features/docker-in-docker:2'
			);
			expect(devcontainerConfig.features).toHaveProperty('ghcr.io/devcontainers/features/node:1');
			expect(devcontainerConfig.features).toHaveProperty(
				'ghcr.io/devcontainers/features/python:1'
			);
		});

		it('should add Doppler CLI to a Python devcontainer', async () => {
			const request = {
				json: async () => ({
					projectName: 'test-project',
					selectedCapabilities: ['devcontainer-python', 'doppler', 'docker'],
					configuration: {
						'devcontainer-python': {
							pythonVersion: '3.12'
						}
					}
				})
			};
			const response = await POST({ request });
			const data = await response.json();
			const dockerfile = data.files.find((f) => f.filePath === '.devcontainer/Dockerfile');
			expect(dockerfile).toBeDefined();
			expect(dockerfile.content).toContain('# Install Doppler CLI');
		});
	});
});
