// webapp/src/lib/models/project-config.js
export class ProjectConfig {
    constructor({ projectName, repositoryUrl, selectedCapabilities, configuration }) {
        this.projectName = projectName;
        this.repositoryUrl = repositoryUrl;
        this.selectedCapabilities = selectedCapabilities;
        this.configuration = configuration;
    }
}