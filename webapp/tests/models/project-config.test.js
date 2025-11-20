import { describe, it, expect } from 'vitest';
import { ProjectConfig } from '$lib/models/project-config.js';

describe('ProjectConfig', () => {
	it('should create an instance with provided properties', () => {
		const config = new ProjectConfig({
			name: 'test-project',
			repositoryUrl: 'https://github.com/test/project',
			selectedCapabilities: ['cap1', 'cap2'],
			configuration: { key: 'value' }
		});

		expect(config.name).toBe('test-project');
		expect(config.repositoryUrl).toBe('https://github.com/test/project');
		expect(config.selectedCapabilities).toEqual(['cap1', 'cap2']);
		expect(config.configuration).toEqual({ key: 'value' });
	});

	it('should convert to object correctly', () => {
		const data = {
			name: 'test-project',
			repositoryUrl: 'https://github.com/test/project',
			selectedCapabilities: ['cap1', 'cap2'],
			configuration: { key: 'value' }
		};
		const config = new ProjectConfig(data);
		expect(config.toObject()).toEqual(data);
	});
});
