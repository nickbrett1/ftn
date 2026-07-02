import { describe, it, expect } from 'vitest';
import { generatePreview } from '$lib/server/preview-generator.js';
import { capabilities } from '$lib/config/capabilities.js';

describe('CircleCI Capability Generation', () => {
	it('should generate .circleci/config.yml when circleci capability is selected', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {
				circleci: {
					deployTarget: 'none'
				}
			}
		};

		const selectedCapabilities = ['circleci'];

		const previewData = await generatePreview(projectConfig, selectedCapabilities);

		// The output is organized into folders. We expect a .circleci folder.
		const circleCiFolder = previewData.files.find(
			(f) => f.name === '.circleci' && f.type === 'folder'
		);
		expect(circleCiFolder).toBeDefined();

		const circleCiFile = circleCiFolder.children.find((f) => f.name === 'config.yml');
		expect(circleCiFile).toBeDefined();

		expect(circleCiFile.content).toContain('version: 2.1');
		expect(circleCiFile.content).toContain('executor: node/default');
		expect(circleCiFile.content).toContain('node: circleci/node@5.0.2');
	});

	it('should generate a test step when devcontainer-node is selected', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {}
		};

		const selectedCapabilities = ['circleci', 'devcontainer-node'];
		const previewData = await generatePreview(projectConfig, selectedCapabilities);

		const circleCiFolder = previewData.files.find(
			(f) => f.name === '.circleci' && f.type === 'folder'
		);
		const circleCiFile = circleCiFolder.children.find((f) => f.name === 'config.yml');

		expect(circleCiFile.content).toContain('npm run test');
	});

	it('should generate Export SonarCloud Token step in circleci config but not sonarcloud scanner orbs/steps when sonarcloud is selected', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {
				circleci: {
					deployTarget: 'none',
					context: {
						enabled: true,
						name: 'common'
					}
				}
			}
		};

		const selectedCapabilities = ['circleci', 'sonarcloud'];

		const previewData = await generatePreview(projectConfig, selectedCapabilities);

		const circleCiFolder = previewData.files.find(
			(f) => f.name === '.circleci' && f.type === 'folder'
		);
		expect(circleCiFolder).toBeDefined();

		const circleCiFile = circleCiFolder.children.find((f) => f.name === 'config.yml');
		expect(circleCiFile).toBeDefined();

		expect(circleCiFile.content).not.toContain('sonarcloud: sonarsource/sonarcloud@2.0.0');
		expect(circleCiFile.content).not.toContain('SONAR_SCANNER_OPTS');
		expect(circleCiFile.content).not.toContain('sonarcloud/scan');
		expect(circleCiFile.content).toContain('Export SonarCloud Token');
		expect(circleCiFile.content).toContain('echo "export SONAR_TOKEN=\\$SONARQUBE_TOKEN" >> $BASH_ENV');
	});

	it('should not contain jobEnvironment if sonarcloud is not selected', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {
				circleci: {
					deployTarget: 'none'
				}
			}
		};

		const selectedCapabilities = ['circleci'];

		const previewData = await generatePreview(projectConfig, selectedCapabilities);

		const circleCiFolder = previewData.files.find(
			(f) => f.name === '.circleci' && f.type === 'folder'
		);
		const circleCiFile = circleCiFolder.children.find((f) => f.name === 'config.yml');

		expect(circleCiFile.content).not.toContain('environment:');
		expect(circleCiFile.content).not.toContain('SONAR_SCANNER_OPTS');
	});
});
