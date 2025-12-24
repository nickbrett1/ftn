import { describe, it, expect, vi } from 'vitest';

import {
	validateProjectName,
	validateRepositoryUrl,
	validateSelectedCapabilities,
	validateCapabilityConfiguration,
	validateProjectConfiguration,
	sanitizeProjectName,
	generateProjectSlug,
	isValidUuid,
	isValidEmail,
	isValidUrl,
	isNotEmpty
} from '$lib/utils/validation.js';

import { getCapabilityById } from '$lib/config/capabilities.js';

// Mock getCapabilityById to test validation of required properties and enums
vi.mock('$lib/config/capabilities', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		getCapabilityById: (id) => {
			if (id === 'mock-required-prop') {
				return {
					id: 'mock-required-prop',
					configurationSchema: {
						type: 'object',
						required: ['mandatoryField'],
						properties: {
							mandatoryField: { type: 'string' }
						}
					}
				};
			}
			return actual.getCapabilityById(id);
		}
	};
});

describe('validation utilities', () => {
	describe('basic validators', () => {
		it('isNotEmpty', () => {
			expect(isNotEmpty('abc')).toBe(true);
			expect(isNotEmpty('  ')).toBe(false);
			expect(isNotEmpty(null)).toBe(false);
		});

		it('isValidUuid', () => {
			expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
			expect(isValidUuid('invalid')).toBe(false);
		});

		it('isValidEmail', () => {
			expect(isValidEmail('test@example.com')).toBe(true);
			expect(isValidEmail('invalid')).toBe(false);
		});

		it('isValidUrl', () => {
			expect(isValidUrl('https://example.com')).toBe(true);
			expect(isValidUrl('invalid')).toBe(false);
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
					selected: ['circleci'],
					configuration: { circleci: { deployTarget: 'invalid' } },
					error: 'Invalid deploy target'
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
				}
			];

			for (const testCase of cases) {
				const result = validateCapabilityConfiguration(testCase.configuration, testCase.selected);
				expect(result).toEqual({ valid: false, errors: [testCase.error] });
			}
		});

		it('validates required properties from schema', () => {
			const result = validateCapabilityConfiguration({ 'mock-required-prop': {} }, [
				'mock-required-prop'
			]);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('mock-required-prop.mandatoryField is required');
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

			expect(result).toEqual({ valid: true });
		});

		it('handles capabilities without validators', () => {
			const result = validateCapabilityConfiguration({}, ['playwright']);
			expect(result.valid).toBe(true);
		});

		it('handles unknown capability gracefully', () => {
			const result = validateCapabilityConfiguration({}, ['unknown-cap']);
			expect(result.valid).toBe(true);
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

		it('validates config even if selectedCapabilities missing', () => {
			const config = { ...baseConfig, selectedCapabilities: undefined };
			// it should fail selectedCapabilities check
			const result = validateProjectConfiguration(config);
			expect(result.valid).toBe(false);
		});

		it('handles missing configuration object gracefully', () => {
			const config = { ...baseConfig, configuration: undefined };
			const result = validateProjectConfiguration(config);
			expect(result.valid).toBe(true);
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
