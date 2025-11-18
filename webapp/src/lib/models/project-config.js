// webapp/src/lib/models/project-config.js
export class ProjectConfig {
	constructor({ name, repositoryUrl, selectedCapabilities, configuration }) {
		this.name = name;
		this.repositoryUrl = repositoryUrl;
		this.selectedCapabilities = selectedCapabilities;
		this.configuration = configuration;
	}

	toObject() {
		return {
			name: this.name,
			repositoryUrl: this.repositoryUrl,
			selectedCapabilities: this.selectedCapabilities,
			configuration: this.configuration
		};
	}
}
