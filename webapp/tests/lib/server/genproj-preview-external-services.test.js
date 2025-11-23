import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePreview } from '$lib/server/preview-generator';
import { capabilities } from '$lib/config/capabilities';

// Mock dependencies
vi.mock('$lib/utils/file-generator', () => ({
	TemplateEngine: class {
		async initialize() {}
		generateFile() {
			return 'content';
		}
		compileTemplate(template) {
			return template;
		}
	}
}));

describe('Preview Generator - External Services', () => {
	it('should generate external services for CircleCI, Doppler, and SonarCloud', async () => {
		const selectedCapabilities = ['circleci', 'doppler', 'sonarcloud'];
		const projectConfig = {
			name: 'test-project',
			repositoryUrl: '',
			isPrivate: false,
			configuration: {}
		};

		const previewData = await generatePreview(projectConfig, selectedCapabilities);
		const externalServices = previewData.externalServices;

		// Verify GitHub is always present
		expect(externalServices).toEqual(
			expect.arrayContaining([expect.objectContaining({ type: 'github' })])
		);

		// Verify CircleCI
		expect(externalServices).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'circleci',
					name: 'CircleCI',
					requiresAuth: true
				})
			])
		);

		// Verify Doppler
		expect(externalServices).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'doppler',
					name: 'Doppler',
					requiresAuth: true
				})
			])
		);

		// Verify SonarCloud
		expect(externalServices).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'sonarcloud',
					name: 'SonarCloud',
					requiresAuth: true
				})
			])
		);
	});
});
