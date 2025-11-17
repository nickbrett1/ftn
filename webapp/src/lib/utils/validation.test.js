// webapp/src/lib/utils/validation.test.js
import { describe, it, expect, vi } from 'vitest';
import * as validation from './validation.js';

// Mock capabilities config
vi.mock('$lib/config/capabilities', () => ({
	getCapabilityById: (id) => ({
		id,
		configurationSchema: {
            type: 'object',
			required: ['nodeVersion']
		}
	}),
	capabilities: [
		{ id: 'sveltekit', name: 'SvelteKit' },
		{ id: 'playwright', name: 'Playwright' },
		{ id: 'devcontainer-node', name: 'Node Devcontainer' }
	]
}));

describe('Validation Utilities', () => {
	describe('isNotEmpty', () => {
		it('should return true for non-empty strings', () => {
			expect(validation.isNotEmpty('test')).toBe(true);
		});
		it('should return false for empty or whitespace strings', () => {
			expect(validation.isNotEmpty('')).toBe(false);
			expect(validation.isNotEmpty('  ')).toBe(false);
			expect(validation.isNotEmpty(null)).toBe(false);
			expect(validation.isNotEmpty(undefined)).toBe(false);
		});
	});

	describe('isValidUuid', () => {
		it('should validate correct UUIDs', () => {
			expect(validation.isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
		});
		it('should invalidate incorrect UUIDs', () => {
			expect(validation.isValidUuid('not-a-uuid')).toBe(false);
		});
	});

	describe('isValidEmail', () => {
		it('should validate correct email addresses', () => {
			expect(validation.isValidEmail('test@example.com')).toBe(true);
		});
		it('should invalidate incorrect email addresses', () => {
			expect(validation.isValidEmail('test@.com')).toBe(false);
			expect(validation.isValidEmail('test@com')).toBe(false);
			expect(validation.isValidEmail('testcom')).toBe(false);
		});
	});

	describe('isValidUrl', () => {
		it('should validate correct URLs', () => {
			expect(validation.isValidUrl('https://example.com')).toBe(true);
		});
		it('should invalidate incorrect URLs', () => {
			expect(validation.isValidUrl('not a url')).toBe(false);
		});
	});

	describe('validateProjectName', () => {
		it('should accept a valid project name', () => {
			expect(validation.validateProjectName('my-awesome-project').valid).toBe(true);
		});
		it('should reject a name that is too short', () => {
			expect(validation.validateProjectName('a').valid).toBe(false);
		});
		it('should reject a name that is too long', () => {
			const longName = 'a'.repeat(51);
			expect(validation.validateProjectName(longName).valid).toBe(false);
		});
		it('should reject a name with invalid characters', () => {
			expect(validation.validateProjectName('my project!').valid).toBe(false);
		});
		it('should reject a reserved name', () => {
			expect(validation.validateProjectName('admin').valid).toBe(false);
		});
	});

	describe('validateRepositoryUrl', () => {
		it('should accept a valid GitHub URL', () => {
			expect(validation.validateRepositoryUrl('https://github.com/owner/repo').valid).toBe(true);
		});
		it('should accept an empty URL', () => {
			expect(validation.validateRepositoryUrl('').valid).toBe(true);
		});
		it('should reject an invalid URL', () => {
			expect(validation.validateRepositoryUrl('not-a-github-url').valid).toBe(false);
		});
	});

	describe('validateSelectedCapabilities', () => {
		it('should accept a valid list of capabilities', () => {
			expect(validation.validateSelectedCapabilities(['sveltekit', 'playwright']).valid).toBe(true);
		});
		it('should reject an empty list', () => {
			expect(validation.validateSelectedCapabilities([]).valid).toBe(false);
		});
		it('should reject a list with invalid IDs', () => {
			expect(validation.validateSelectedCapabilities(['sveltekit', 'invalid-id']).valid).toBe(false);
		});
		it('should reject a list with duplicates', () => {
			expect(validation.validateSelectedCapabilities(['sveltekit', 'sveltekit']).valid).toBe(false);
		});
	});

	describe('validateCapabilityConfiguration', () => {
		it('should validate correct configurations', () => {
			const config = { 'devcontainer-node': { nodeVersion: '20' } };
			const selected = ['devcontainer-node'];
			expect(validation.validateCapabilityConfiguration(config, selected).valid).toBe(true);
		});

		it('should reject an invalid configuration', () => {
			const config = { 'devcontainer-node': { nodeVersion: '99' } }; // Invalid version
			const selected = ['devcontainer-node'];
			const result = validation.validateCapabilityConfiguration(config, selected);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Invalid Node.js version');
		});
	});

	describe('validateProjectConfiguration', () => {
		it('should accept a valid project configuration', () => {
			const config = {
				projectName: 'my-project',
				repositoryUrl: 'https://github.com/test/my-project',
				selectedCapabilities: ['sveltekit'],
				configuration: {}
			};
			expect(validation.validateProjectConfiguration(config).valid).toBe(true);
		});

		it('should reject an invalid project configuration and aggregate errors', () => {
			const config = {
				projectName: 'a', // Too short
				repositoryUrl: 'invalid-url',
				selectedCapabilities: [] // Empty
			};
			const result = validation.validateProjectConfiguration(config);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(3);
		});
	});

	describe('sanitizeProjectName', () => {
		it('should create a slug from a project name', () => {
			expect(validation.sanitizeProjectName('My Awesome Project!')).toBe('my-awesome-project');
		});
	});
});
