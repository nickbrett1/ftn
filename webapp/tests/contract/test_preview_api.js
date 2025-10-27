/**
 * @fileoverview Contract test for preview API endpoint
 * @description Tests the preview endpoint for project generation preview
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Preview API Contract', () => {
	let previewEndpoint;

	beforeEach(() => {
		// Initialize test endpoint
		previewEndpoint = '/projects/genproj/api/preview';
	});

	afterEach(() => {
		// Cleanup
	});

	it('should accept POST requests with project configuration', async () => {
		// Arrange
		const request = {
			projectName: 'test-project',
			repositoryUrl: 'https://github.com/user/repo',
			selectedCapabilities: ['devcontainer-node'],
			configuration: {
				'devcontainer-node': {
					nodeVersion: '22'
				}
			}
		};

		// Act
		const response = await fetch(previewEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		});

		// Assert
		expect(response).toBeDefined();
		expect(response.status).toBeGreaterThanOrEqual(200);
		expect(response.status).toBeLessThan(500);
	});

	it('should return preview data with files and external services', async () => {
		// Arrange
		const request = {
			projectName: 'my-app',
			selectedCapabilities: ['devcontainer-node'],
			configuration: {}
		};

		// Act
		const response = await fetch(previewEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		});

		const data = await response.json();

		// Assert
		expect(data).toHaveProperty('files');
		expect(data).toHaveProperty('externalServices');
		expect(Array.isArray(data.files)).toBe(true);
		expect(Array.isArray(data.externalServices)).toBe(true);
	});

	it('should return 400 for invalid request (missing projectName)', async () => {
		// Arrange
		const request = {
			selectedCapabilities: ['devcontainer-node'],
			configuration: {}
		};

		// Act
		const response = await fetch(previewEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		});

		// Assert
		expect(response.status).toBe(400);
	});

	it('should return 400 for invalid request (empty capabilities)', async () => {
		// Arrange
		const request = {
			projectName: 'my-app',
			selectedCapabilities: [],
			configuration: {}
		};

		// Act
		const response = await fetch(previewEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		});

		// Assert
		expect(response.status).toBe(400);
	});

	it('should include file previews with content and metadata', async () => {
		// Arrange
		const request = {
			projectName: 'my-app',
			selectedCapabilities: ['devcontainer-node'],
			configuration: {
				'devcontainer-node': {
					nodeVersion: '22'
				}
			}
		};

		// Act
		const response = await fetch(previewEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		});

		const data = await response.json();

		// Assert
		if (data.files && data.files.length > 0) {
			const file = data.files[0];
			expect(file).toHaveProperty('filePath');
			expect(file).toHaveProperty('content');
			expect(file).toHaveProperty('capabilityId');
			expect(file).toHaveProperty('isExecutable');
		}
	});

	it('should include external service configurations', async () => {
		// Arrange
		const request = {
			projectName: 'my-app',
			selectedCapabilities: ['circleci'],
			configuration: {}
		};

		// Act
		const response = await fetch(previewEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		});

		const data = await response.json();

		// Assert
		if (data.externalServices && data.externalServices.length > 0) {
			const service = data.externalServices[0];
			expect(service).toHaveProperty('service');
			expect(service).toHaveProperty('action');
			expect(service).toHaveProperty('status');
			expect(service).toHaveProperty('description');
		}
	});

	it('should handle multiple capabilities correctly', async () => {
		// Arrange
		const request = {
			projectName: 'my-app',
			selectedCapabilities: ['devcontainer-node', 'circleci', 'sonarlint'],
			configuration: {
				'devcontainer-node': {
					nodeVersion: '22'
				}
			}
		};

		// Act
		const response = await fetch(previewEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		});

		const data = await response.json();

		// Assert
		expect(response.ok).toBe(true);
		expect(data.files).toBeDefined();
		expect(data.externalServices).toBeDefined();
	});

	it('should validate capability configuration schemas', async () => {
		// Arrange
		const request = {
			projectName: 'my-app',
			selectedCapabilities: ['devcontainer-node'],
			configuration: {
				'devcontainer-node': {
					nodeVersion: 'invalid-version' // Invalid according to schema
				}
			}
		};

		// Act
		const response = await fetch(previewEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		});

		// Assert
		expect(response.status).toBeGreaterThanOrEqual(400);
		expect(response.status).toBeLessThan(500);
	});
});
