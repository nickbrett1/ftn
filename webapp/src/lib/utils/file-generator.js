/**
 * File Generation Utility
 *
 * Provides utilities for generating project files, templates, and configurations
 * based on selected capabilities in the genproj tool.
 *
 * @fileoverview Universal file generation utilities for genproj
 */

/**
 * @typedef {Object} FileTemplate
 * @property {string} path - File path relative to project root
 * @property {string} content - File content (can include template variables)
 * @property {string} [description] - Description of what this file does
 * @property {boolean} [executable] - Whether the file should be executable
 */

/**
 * @typedef {Object} GenerationContext
 * @property {string} projectName - Name of the project
 * @property {string} [repositoryUrl] - Repository URL if provided
 * @property {string[]} capabilities - Selected capabilities
 * @property {Object} configuration - Capability-specific configuration
 * @property {Object} metadata - Additional metadata (timestamps, user info, etc.)
 */

/**
 * Template variable replacement utility
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} variables - Object containing variable values
 * @returns {string} Processed template with variables replaced
 */
export function processTemplate(template, variables) {
	if (template && typeof template === 'string') {
		// Replace {{variable}} patterns
		return template.replaceAll(/\{\{(\w+)\}\}/g, (match, variableName) => {
			const value = variables[variableName];
			return value === undefined ? match : String(value);
		});
	}
	return '';
}

/**
 * Generates a package.json file based on selected capabilities
 * @param {GenerationContext} context - Generation context
 * @returns {FileTemplate} Generated package.json file template
 */
export function generatePackageJson(context) {
	const { projectName, capabilities } = context;

	// Base package.json structure
	const packageJson = {
		name: projectName.toLowerCase().replaceAll(/[^a-z0-9-]/g, '-'),
		version: '0.0.1',
		private: true,
		scripts: {
			dev: 'vite dev',
			build: 'vite build',
			preview: 'vite preview',
			check: 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
			'check:watch': 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch'
		},
		devDependencies: {},
		dependencies: {}
	};

	// Add dependencies based on capabilities
	if (capabilities.includes('sveltekit')) {
		packageJson.devDependencies = {
			...packageJson.devDependencies,
			'@sveltejs/adapter-auto': '^3.0.0',
			'@sveltejs/kit': '^2.0.0',
			svelte: '^4.2.0',
			vite: '^5.0.0'
		};
	}

	if (capabilities.includes('tailwindcss')) {
		packageJson.devDependencies = {
			...packageJson.devDependencies,
			tailwindcss: '^3.4.0',
			autoprefixer: '^10.4.0',
			postcss: '^8.4.0'
		};
	}

	if (capabilities.includes('typescript')) {
		packageJson.devDependencies = {
			...packageJson.devDependencies,
			'@sveltejs/adapter-auto': '^3.0.0',
			'@sveltejs/kit': '^2.0.0',
			svelte: '^4.2.0',
			vite: '^5.0.0',
			typescript: '^5.0.0',
			'@types/node': '^20.0.0'
		};
	}

	if (capabilities.includes('testing')) {
		packageJson.devDependencies = {
			...packageJson.devDependencies,
			vitest: '^1.0.0',
			'@testing-library/svelte': '^4.0.0',
			'@testing-library/jest-dom': '^6.0.0'
		};
	}

	if (capabilities.includes('playwright')) {
		packageJson.devDependencies = {
			...packageJson.devDependencies,
			'@playwright/test': '^1.40.0'
		};
	}

	return {
		path: 'package.json',
		content: JSON.stringify(packageJson, null, 2),
		description: 'Node.js package configuration with dependencies for selected capabilities'
	};
}

/**
 * Generates a README.md file based on selected capabilities
 * @param {GenerationContext} context - Generation context
 * @returns {FileTemplate} Generated README.md file template
 */
export function generateReadme(context) {
	const { projectName, capabilities, repositoryUrl } = context;

	const readmeContent = `# ${projectName}

${repositoryUrl ? `Repository: ${repositoryUrl}` : 'A new project generated with genproj'}

## Overview

This project was generated using the genproj tool with the following capabilities:

${capabilities.map((cap) => `- ${cap}`).join('\n')}

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm or yarn

### Installation

\`\`\`bash
npm install
\`\`\`

### Development

\`\`\`bash
npm run dev
\`\`\`

### Building

\`\`\`bash
npm run build
\`\`\`

## Project Structure

\`\`\`
${projectName}/
├── src/                 # Source code
├── static/              # Static assets
├── tests/               # Test files
├── package.json         # Dependencies and scripts
└── README.md           # This file
\`\`\`

## Capabilities

${capabilities
	.map((cap) => {
		const capabilityDescriptions = {
			sveltekit: 'SvelteKit framework for web applications',
			tailwindcss: 'TailwindCSS for utility-first styling',
			typescript: 'TypeScript for type safety',
			testing: 'Vitest and Testing Library for unit testing',
			playwright: 'Playwright for end-to-end testing',
			devcontainer: 'DevContainer for consistent development environment',
			circleci: 'CircleCI for continuous integration',
			sonarcloud: 'SonarCloud for code quality analysis',
			doppler: 'Doppler for secrets management'
		};
		return `### ${cap}
${capabilityDescriptions[cap] || 'Additional project capability'}`;
	})
	.join('\n\n')}

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
`;

	return {
		path: 'README.md',
		content: readmeContent,
		description: 'Project documentation with setup instructions and capability overview'
	};
}

/**
 * Generates a .gitignore file based on selected capabilities
 * @param {GenerationContext} context - Generation context
 * @returns {FileTemplate} Generated .gitignore file template
 */
export function generateGitignore(context) {
	const { capabilities } = context;

	let gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
.svelte-kit/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port
`;

	// Add capability-specific ignores
	if (capabilities.includes('typescript')) {
		gitignoreContent += `
# TypeScript
*.tsbuildinfo
`;
	}

	if (capabilities.includes('testing')) {
		gitignoreContent += `
# Test coverage
coverage/
test-results/
playwright-report/
`;
	}

	if (capabilities.includes('devcontainer')) {
		gitignoreContent += `
# DevContainer
.devcontainer/
`;
	}

	return {
		path: '.gitignore',
		content: gitignoreContent,
		description: 'Git ignore patterns for selected project capabilities'
	};
}

/**
 * Generates a devcontainer.json file for development environment
 * @param {GenerationContext} context - Generation context
 * @returns {FileTemplate} Generated devcontainer.json file template
 */
export function generateDevcontainer(context) {
	const { capabilities } = context;

	const devcontainer = {
		name: context.projectName,
		image: 'mcr.microsoft.com/devcontainers/javascript-node:20',
		features: {},
		customizations: {
			vscode: {
				extensions: [
					'svelte.svelte-vscode',
					'bradlc.vscode-tailwindcss',
					'esbenp.prettier-vscode',
					'ms-vscode.vscode-typescript-next'
				],
				settings: {
					'editor.formatOnSave': true,
					'editor.defaultFormatter': 'esbenp.prettier-vscode'
				}
			}
		},
		postCreateCommand: 'npm install',
		remoteUser: 'node'
	};

	// Add features based on capabilities
	if (capabilities.includes('java')) {
		devcontainer.features['ghcr.io/devcontainers/features/java:1'] = {
			version: '17'
		};
	}

	if (capabilities.includes('python')) {
		devcontainer.features['ghcr.io/devcontainers/features/python:1'] = {
			version: '3.11'
		};
	}

	// Add SonarLint if Java is selected
	if (capabilities.includes('sonarlint') && capabilities.includes('java')) {
		devcontainer.customizations.vscode.extensions.push('SonarSource.sonarlint-vscode');
		devcontainer.customizations.vscode.settings['sonarlint.ls.javaHome'] =
			'/usr/local/sdkman/candidates/java/current';
	}

	return {
		path: '.devcontainer/devcontainer.json',
		content: JSON.stringify(devcontainer, null, 2),
		description: 'DevContainer configuration for consistent development environment'
	};
}

/**
 * Generates a Dockerfile for containerization
 * @param {GenerationContext} context - Generation context
 * @returns {FileTemplate} Generated Dockerfile template
 */
export function generateDockerfile(context) {
	let dockerfileContent = `FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
`;

	return {
		path: 'Dockerfile',
		content: dockerfileContent,
		description: 'Dockerfile for containerizing the application'
	};
}

/**
 * Generates all project files based on selected capabilities
 * @param {GenerationContext} context - Generation context
 * @returns {FileTemplate[]} Array of generated file templates
 */
export function generateAllFiles(context) {
	const files = [];

	// Always generate these files
	files.push(generatePackageJson(context), generateReadme(context), generateGitignore(context));

	// Generate capability-specific files
	if (context.capabilities.includes('devcontainer')) {
		files.push(generateDevcontainer(context));
	}

	if (context.capabilities.includes('docker')) {
		files.push(generateDockerfile(context));
	}

	// Add more capability-specific file generation here
	// if (context.capabilities.includes('circleci')) {
	//     files.push(generateCircleCIConfig(context));
	// }

	return files;
}
