/**
 * @fileoverview Tests for capabilities API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server.js';

// Mock dependencies
vi.mock('@sveltejs/kit', () => ({
	json: (data, options) => ({
		status: options?.status || 200,
		body: JSON.stringify(data),
		json: async () => data
	}),
	error: (status, message) => ({ status, body: message })
}));

vi.mock('$lib/config/capabilities.js', () => ({
	capabilities: [
		{
			id: 'devcontainer-node',
			name: 'Node.js DevContainer',
			category: 'devcontainer',
			dependencies: [],
			conflicts: [],
			requiresAuth: [],
			configurationSchema: {
				type: 'object',
				properties: {
					nodeVersion: { type: 'string', enum: ['22', '20'], default: '22' }
				}
			}
		},
		{
			id: 'sonarlint',
			name: 'SonarLint',
			category: 'code-quality',
			dependencies: ['sonarcloud'],
			conflicts: [],
			requiresAuth: [],
			configurationSchema: {
				type: 'object',
				properties: {}
			}
		},
		{
			id: 'docker',
			name: 'Docker',
			category: 'internal',
			dependencies: [],
			conflicts: [],
			requiresAuth: [],
			configurationSchema: {
				type: 'object',
				properties: {}
			}
		}
	]
}));

vi.mock('$lib/utils/genproj-errors.js', () => ({
	withErrorHandling: (fn) => fn
}));

vi.mock('$lib/utils/logging.js', () => ({
	logger: {
		error: vi.fn()
	}
}));

describe('Capabilities API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET', () => {
		it('should return all capabilities with metadata', async () => {
			const response = await GET({ url: new URL('http://localhost') });
			const data = await response.json();

			expect(data.capabilities).toBeDefined();
			expect(data.metadata).toBeDefined();
			expect(data.metadata.total).toBe(3);
			expect(data.metadata.categories).toBeDefined();
			expect(data.metadata.timestamp).toBeDefined();
		});
		it('should include the docker capability', async () => {
			const response = await GET({ url: new URL('http://localhost') });
			const data = await response.json();

			const dockerCapability = data.capabilities.find((c) => c.id === 'docker');
			expect(dockerCapability).toBeDefined();
		});
	});

	describe('POST', () => {
		it('should validate capability selection', async () => {
			const request = {
				json: async () => ({
					selectedCapabilities: ['devcontainer-node']
				})
			};

			const response = await POST({ request });
			const data = await response.json();

			expect(data.valid).toBe(true);
			expect(data.selectedCapabilities).toEqual(['devcontainer-node']);
		});

		it('should reject non-array selection', async () => {
			const request = {
				json: async () => ({
					selectedCapabilities: 'not-an-array'
				})
			};

			const response = await POST({ request });
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain('array');
		});

		it('should reject empty selection', async () => {
			const request = {
				json: async () => ({
					selectedCapabilities: []
				})
			};

			const response = await POST({ request });
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain('At least one');
		});

		it('should reject invalid capability IDs', async () => {
			const request = {
				json: async () => ({
					selectedCapabilities: ['invalid-capability']
				})
			};

			const response = await POST({ request });
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain('Invalid capability');
			expect(data.invalidCapabilities).toContain('invalid-capability');
		});

		it('should detect missing dependencies', async () => {
			const request = {
				json: async () => ({
					selectedCapabilities: ['sonarlint']
				})
			};

			const response = await POST({ request });
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain('validation failed');
			expect(data.missing).toBeDefined();
		});

		it('should return required auth services', async () => {
			const request = {
				json: async () => ({
					selectedCapabilities: ['devcontainer-node']
				})
			};

			const response = await POST({ request });
			const data = await response.json();

			expect(data.requiredAuth).toBeDefined();
			expect(Array.isArray(data.requiredAuth)).toBe(true);
		});
	});
});
