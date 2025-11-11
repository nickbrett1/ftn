import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, waitFor } from '@testing-library/svelte';
import GenprojPage from '../../src/routes/projects/genproj/+page.svelte';

// Mock fetch globally
globalThis.fetch = vi.fn();

// Mock window.location
Object.defineProperty(globalThis, 'location', {
	value: {
		href: '',
		reload: vi.fn()
	},
	writable: true
});

// Mock child components
vi.mock('../../src/lib/components/Login.svelte', () => ({
	default: vi.fn().mockImplementation(() => ({
		$set: vi.fn(),
		$on: vi.fn(),
		$destroy: vi.fn()
	}))
}));

vi.mock('../../src/lib/components/genproj/CapabilitySelector.svelte', () => ({
	default: vi.fn().mockImplementation(() => ({
		$set: vi.fn(),
		$on: vi.fn(),
		$destroy: vi.fn()
	}))
}));

describe('Genproj Page Component', () => {
	const defaultProps = {
		isAuthenticated: false,
		data: {
			capabilities: [
				{
					id: 'devcontainer-node',
					name: 'Node.js DevContainer Support',
					description: 'Adds Node.js runtime and common tools to your development container',
					category: 'devcontainer',
					dependencies: [],
					conflicts: [],
					requiresAuth: [],
					configurationSchema: {
						type: 'object',
						properties: {
							nodeVersion: { type: 'string', enum: ['22', '20', '18'], default: '22' }
						}
					}
				},
				{
					id: 'circleci',
					name: 'CircleCI CI/CD',
					description: 'Continuous integration and deployment with CircleCI',
					category: 'ci-cd',
					dependencies: [],
					conflicts: [],
					requiresAuth: ['circleci'],
					configurationSchema: {
						type: 'object',
						properties: {}
					}
				},
				{
					id: 'sonarlint',
					name: 'SonarLint for VS Code',
					description: 'VS Code extension configuration for SonarLint code quality analysis',
					category: 'code-quality',
					dependencies: ['sonarcloud'],
					conflicts: [],
					requiresAuth: [],
					configurationSchema: {
						type: 'object',
						properties: {}
					}
				}
			],
			categories: {
				devcontainer: { name: 'DevContainer', count: 1 },
				'ci-cd': { name: 'CI/CD', count: 1 },
				'code-quality': { name: 'Code Quality', count: 1 }
			},
			selectedCapabilities: []
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		cleanup();
	});

	afterEach(() => {
		cleanup();
	});

	it('should show the main page title', async () => {
		render(GenprojPage, { props: defaultProps });
		expect(await screen.findByText('Project Generator')).toBeTruthy();
	});

	it('should render the CapabilitySelector component', async () => {
		render(GenprojPage, { props: defaultProps });
		expect(screen.getByTestId('capability-selector')).toBeTruthy();
	});
});
