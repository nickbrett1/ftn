import { describe, it, expect, vi } from 'vitest';

import {
	isNotEmpty,
	isValidUuid,
	isValidEmail,
	isValidUrl,
	validateProjectName,
	validateRepositoryUrl,
	validateSelectedCapabilities,
	validateCapabilityConfiguration,
	validateProjectConfiguration,
	sanitizeProjectName,
	generateProjectSlug
} from '$lib/utils/validation.js';

vi.mock('$lib/config/capabilities', () => {
	const MOCK_CAPABILITIES = {
		'devcontainer-node': {
			id: 'devcontainer-node',
			configurationSchema: { required: ['nodeVersion'] }
		},
		'devcontainer-python': {
			id: 'devcontainer-python',
			configurationSchema: { required: ['packageManager'] }
		},
		'devcontainer-java': {
			id: 'devcontainer-java',
			configurationSchema: { required: ['javaVersion'] }
		},
		circleci: { id: 'circleci', configurationSchema: { required: ['deployTarget'] } },
		'github-actions': {
			id: 'github-actions',
			configurationSchema: { required: ['nodeVersion'] }
		},
		sonarcloud: { id: 'sonarcloud', configurationSchema: { required: ['language'] } },
		doppler: { id: 'doppler', configurationSchema: { required: ['projectType'] } },
		'cloudflare-wrangler': {
			id: 'cloudflare-wrangler',
			configurationSchema: { required: ['workerType'] }
		},
		dependabot: { id: 'dependabot', configurationSchema: { required: ['ecosystems'] } },
		'lighthouse-ci': { id: 'lighthouse-ci', configurationSchema: { required: ['thresholds'] } },
		playwright: { id: 'playwright', configurationSchema: { required: ['browsers'] } },
		'spec-kit': { id: 'spec-kit', configurationSchema: { required: ['specFormat'] } }
	};

	return {
		getCapabilityById: (id) => MOCK_CAPABILITIES[id],
		capabilities: Object.values(MOCK_CAPABILITIES)
	};
});

describe('validation utilities', () => {
	describe('isNotEmpty', () => {
		it('returns true for non-empty strings', () => {
			expect(isNotEmpty('test')).toBe(true);
			expect(isNotEmpty(' test ')).toBe(true);
		});

		it('returns false for empty or whitespace-only strings', () => {
			expect(isNotEmpty('')).toBe(false);
			expect(isNotEmpty('   ')).toBe(false);
		});

		it('returns false for non-string values', () => {
			expect(isNotEmpty(null)).toBe(false);
			expect(isNotEmpty(undefined)).toBe(false);
			expect(isNotEmpty(123)).toBe(false);
			expect(isNotEmpty({})).toBe(false);
		});
	});

	describe('isValidUuid', () => {
		it('returns true for valid UUIDs', () => {
			expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
		});

		it('returns false for invalid UUIDs', () => {
			expect(isValidUuid('not-a-uuid')).toBe(false);
			expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // one char short
		});
	});

	describe('isValidEmail', () => {
		it('returns true for valid emails', () => {
			expect(isValidEmail('test@example.com')).toBe(true);
		});

		it('returns false for invalid emails', () => {
			expect(isValidEmail('test@.com')).toBe(false);
			expect(isValidEmail('test@com')).toBe(false);
			expect(isValidEmail('test.com')).toBe(false);
			expect(isValidEmail('@example.com')).toBe(false);
		});
	});

	describe('isValidUrl', () => {
		it('returns true for valid URLs', () => {
			expect(isValidUrl('http://example.com')).toBe(true);
			expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
		});

		it('returns false for invalid URLs', () => {
			expect(isValidUrl('example.com')).toBe(false);
			expect(isValidUrl('not a url')).toBe(false);
		});
	});

	describe('validateProjectName', () => {
		it('rejects missing or non-string names', () => {
			expect(validateProjectName('')).toEqual({ valid: false, error: 'Project name is required' });
			expect(validateProjectName(null)).toEqual({
				valid: false,
				error: 'Project name is required'
			});
			expect(validateProjectName(42)).toEqual({ valid: false, error: 'Project name is required' });
		});

		it('enforces length limits', () => {
			expect(validateProjectName('ab')).toEqual({
				valid: false,
				error: 'Project name must be at least 3 characters long'
			});

			expect(validateProjectName('a'.repeat(51))).toEqual({
				valid: false,
				error: 'Project name must be no more than 50 characters long'
			});
		});

		it('rejects invalid characters and reserved names', () => {
			expect(validateProjectName('invalid name')).toEqual({
				valid: false,
				error: 'Project name can only contain letters, numbers, hyphens, and underscores'
			});

			expect(validateProjectName('Admin')).toEqual({
				valid: false,
				error: 'Project name is reserved and cannot be used'
			});
		});

		it('accepts valid names', () => {
			expect(validateProjectName('my_project-123')).toEqual({ valid: true });
		});
	});

	describe('validateRepositoryUrl', () => {
		it('allows empty values', () => {
			expect(validateRepositoryUrl()).toEqual({ valid: true });
		});

		it('rejects non-string values', () => {
			expect(validateRepositoryUrl(123)).toEqual({
				valid: false,
				error: 'Repository URL must be a string'
			});
		});

		it('validates GitHub URL pattern', () => {
			expect(validateRepositoryUrl('https://example.com/foo/bar')).toEqual({
				valid: false,
				error: 'Repository URL must be a valid GitHub URL (https://github.com/owner/repo)'
			});

			expect(validateRepositoryUrl('https://github.com/owner/repo')).toEqual({ valid: true });
		});
	});

	describe('validateSelectedCapabilities', () => {
		it('enforces array input and limits', () => {
			expect(validateSelectedCapabilities('not-an-array')).toEqual({
				valid: false,
				error: 'Selected capabilities must be an array'
			});

			expect(validateSelectedCapabilities([])).toEqual({
				valid: false,
				error: 'At least one capability must be selected'
			});

			expect(
				validateSelectedCapabilities(Array.from({ length: 21 }).fill('devcontainer-node'))
			).toEqual({
				valid: false,
				error: 'Too many capabilities selected (maximum 20)'
			});
		});

		it('validates capability identifiers and duplicates', () => {
			expect(validateSelectedCapabilities(['unknown'])).toEqual({
				valid: false,
				error: 'Invalid capability ID: unknown'
			});

			expect(validateSelectedCapabilities(['doppler', 'doppler'])).toEqual({
				valid: false,
				error: 'Duplicate capabilities are not allowed'
			});

			expect(validateSelectedCapabilities(['doppler', 'playwright'])).toEqual({ valid: true });
		});
	});

	describe('validateCapabilityConfiguration', () => {
		it('requires configuration object', () => {
			expect(validateCapabilityConfiguration(null, ['doppler'])).toEqual({
				valid: false,
				errors: ['Configuration must be an object']
			});
		});

		it('validates capability-specific constraints', () => {
			const cases = [
				{
					selected: ['devcontainer-node'],
					configuration: { 'devcontainer-node': { nodeVersion: '16', enabled: true } },
					error: 'Invalid Node.js version'
				},
				{
					selected: ['devcontainer-python'],
					configuration: { 'devcontainer-python': { packageManager: 'conda' } },
					error: 'Invalid package manager'
				},
				{
					selected: ['devcontainer-java'],
					configuration: { 'devcontainer-java': { javaVersion: '8' } },
					error: 'Invalid Java version'
				},
				{
					selected: ['circleci'],
					configuration: { circleci: { deployTarget: 'invalid' } },
					error: 'Invalid deploy target'
				},
				{
					selected: ['github-actions'],
					configuration: { circleci: {}, 'github-actions': { nodeVersion: '16' } },
					error: 'Invalid Node.js version'
				},
				{
					selected: ['sonarcloud'],
					configuration: { sonarcloud: { language: 'ruby' } },
					error: 'Invalid language'
				},
				{
					selected: ['doppler'],
					configuration: { doppler: { projectType: 'desktop' } },
					error: 'Invalid project type'
				},
				{
					selected: ['cloudflare-wrangler'],
					configuration: { 'cloudflare-wrangler': { workerType: 'invalid' } },
					error: 'Invalid worker type'
				},
				{
					selected: ['dependabot'],
					configuration: { dependabot: { ecosystems: ['invalid'] } },
					error: 'Invalid ecosystem: invalid'
				},
				{
					selected: ['lighthouse-ci'],
					configuration: { 'lighthouse-ci': { thresholds: { performance: 101 } } },
					error: 'Threshold performance must be a number between 0 and 100'
				},
				{
					selected: ['playwright'],
					configuration: { playwright: { browsers: ['safari'] } },
					error: 'Invalid browser: safari'
				},
				{
					selected: ['spec-kit'],
					configuration: { 'spec-kit': { specFormat: 'docx' } },
					error: 'Invalid spec format'
				}
			];

			for (const testCase of cases) {
				const result = validateCapabilityConfiguration(testCase.configuration, testCase.selected);
				expect(result).toEqual({ valid: false, errors: [testCase.error] });
			}
		});

		it('returns valid when all configurations pass', () => {
			const configuration = {
				'cloudflare-wrangler': { workerType: 'web' },
				dependabot: { ecosystems: ['npm'], updateSchedule: 'weekly' }
			};

			const result = validateCapabilityConfiguration(configuration, [
				'cloudflare-wrangler',
				'dependabot'
			]);

			expect(result).toEqual({ valid: true, errors: [] });
		});
	});

	describe('validateProjectConfiguration', () => {
		const baseConfig = {
			projectName: 'valid-project',
			repositoryUrl: 'https://github.com/example/repo',
			selectedCapabilities: ['doppler'],
			configuration: { doppler: { projectType: 'web' } }
		};

		it('aggregates validation errors', () => {
			const invalidConfig = {
				...baseConfig,
				projectName: 'in valid',
				repositoryUrl: 'invalid',
				selectedCapabilities: ['doppler', 'unknown'],
				configuration: { doppler: { projectType: 'desktop' } }
			};

			const result = validateProjectConfiguration(invalidConfig);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				'Project name can only contain letters, numbers, hyphens, and underscores'
			);
			expect(result.errors).toContain(
				'Repository URL must be a valid GitHub URL (https://github.com/owner/repo)'
			);
			expect(result.errors).toContain('Invalid capability ID: unknown');
			expect(result.errors).toContain('Invalid project type');
		});

		it('returns valid true when everything passes', () => {
			const result = validateProjectConfiguration(baseConfig);
			expect(result).toEqual({ valid: true, errors: [] });
		});
	});

	describe('sanitizeProjectName and generateProjectSlug', () => {
		it('sanitizes project names consistently', () => {
			expect(sanitizeProjectName('My Cool Project!')).toBe('my-cool-project');
			expect(sanitizeProjectName('--Already--Clean--')).toBe('already-clean');
			expect(sanitizeProjectName(null)).toBe('');
		});

		it('generateProjectSlug delegates to sanitizeProjectName', () => {
			expect(generateProjectSlug('Another Project')).toBe('another-project');
		});
	});
});
