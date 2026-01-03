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
	},
	GEMINI_DEV_ALIAS: 'gemini-dev-alias',
	SHELL_SETUP_SCRIPT: 'shell-setup-script',
	GIT_SAFE_DIR_SCRIPT: 'git-safe-dir-script',
	GEMINI_SETUP_SCRIPT: 'gemini-setup-script',
	PLAYWRIGHT_SETUP_SCRIPT: 'playwright-setup-script',
	DOPPLER_LOGIN_SCRIPT: 'doppler-login-script',
	WRANGLER_LOGIN_SCRIPT: 'wrangler-login-script',
	SETUP_WRANGLER_SCRIPT: 'setup-wrangler-script',
	DOPPLER_INSTALL_SCRIPT: 'doppler-install-script'
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
