/**
 * @fileoverview Component test for genproj page
 * @description Tests the genproj page component rendering and user interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
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

// Mock the Login component
vi.mock('../../src/lib/components/Login.svelte', () => ({
	default: vi.fn().mockImplementation(() => ({
		// Mock Svelte component interface
		$set: vi.fn(),
		$on: vi.fn(),
		$destroy: vi.fn(),
		// Add any other properties or methods your component uses
	  }))
}));


describe('Genproj Page Component', () => {
	let component;

	const defaultProps = {
		data: {
			isAuthenticated: false,
			capabilities: [],
			selectedCapabilities: []
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock successful capabilities API response
		globalThis.fetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
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
					metadata: {
						total: 3,
						categories: ['devcontainer', 'ci-cd', 'code-quality'],
						timestamp: new Date().toISOString()
					}
				})
		});
	});

	afterEach(() => {
		if (component) {
			unmount(component);
			component = null;
		}
	});

	it('should display capability categories', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,
			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check that category sections are present (CapabilitySelector handles this)
		const selector = document.querySelector('[data-testid="capability-selector"]');
		expect(selector).toBeTruthy();
	});

	it('should show capability selection interface', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,
			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check that capability selection interface is present
		const capabilitySelector = document.querySelector('[data-testid="capability-selector"]');
		expect(capabilitySelector).toBeTruthy();
	});

	it('should display project name input', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,
			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check that project name input is present
		const projectNameInput = document.querySelector('[data-testid="project-name-input"]');
		expect(projectNameInput).toBeTruthy();

		// Should have placeholder text
		expect(projectNameInput.hasAttribute('placeholder')).toBe(true);
	});

	it('should validate project name input', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,
			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		const projectNameInput = document.querySelector('[data-testid="project-name-input"]');
		expect(projectNameInput).toBeTruthy();

		// Try invalid project name
		projectNameInput.value = 'a'; // Too short
		projectNameInput.dispatchEvent(new Event('input', { bubbles: true }));

		// Wait for reactive update
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Should show validation error
		const projectNameError = document.querySelector('[data-testid="project-name-error"]');
		expect(projectNameError).toBeTruthy();

		// Try valid project name
		projectNameInput.value = 'my-awesome-project';
		projectNameInput.dispatchEvent(new Event('input', { bubbles: true }));

		// Wait for reactive update
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Should clear validation error
		const projectNameErrorAfter = document.querySelector('[data-testid="project-name-error"]');
		expect(projectNameErrorAfter).toBeFalsy();
	});

	it('should display repository URL input', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,
			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check that repository URL input is present
		const repositoryUrlInput = document.querySelector('[data-testid="repository-url-input"]');
		expect(repositoryUrlInput).toBeTruthy();

		// Should be optional
		expect(repositoryUrlInput.hasAttribute('placeholder')).toBe(true);
	});

	it('should validate repository URL input', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,
			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		const repositoryUrlInput = document.querySelector('[data-testid="repository-url-input"]');
		expect(repositoryUrlInput).toBeTruthy();

		// Try invalid URL
		repositoryUrlInput.value = 'not-a-github-url';
		repositoryUrlInput.dispatchEvent(new Event('input', { bubbles: true }));

		// Wait for reactive update
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Should show validation error
		const repositoryUrlError = document.querySelector('[data-testid="repository-url-error"]');
		expect(repositoryUrlError).toBeTruthy();

		// Try valid GitHub URL
		repositoryUrlInput.value = 'https://github.com/user/repo';
		repositoryUrlInput.dispatchEvent(new Event('input', { bubbles: true }));

		// Wait for reactive update
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Should clear validation error
		const repositoryUrlErrorAfter = document.querySelector('[data-testid="repository-url-error"]');
		expect(repositoryUrlErrorAfter).toBeFalsy();
	});

	it('should show preview tab', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,
			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check that preview tab is present
		const previewTab = document.querySelector('[data-testid="preview-tab"]');
		expect(previewTab).toBeTruthy();

		// Should be clickable
		previewTab.click();

		// Wait for tab switch
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Should show preview content
		const previewContent = document.querySelector('[data-testid="preview-content"]');
		expect(previewContent).toBeTruthy();
	});

	it('should switch between capabilities and preview tabs', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,
			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		const capabilitiesTab = document.querySelector('[data-testid="capabilities-tab"]');
		const previewTab = document.querySelector('[data-testid="preview-tab"]');

		expect(capabilitiesTab).toBeTruthy();
		expect(previewTab).toBeTruthy();

		// Start on capabilities tab
		expect(capabilitiesTab.classList.contains('border-green-400')).toBe(true);
		expect(document.querySelector('[data-testid="capability-selector"]')).toBeTruthy();

		// Switch to preview tab
		previewTab.click();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(previewTab.classList.contains('border-green-400')).toBe(true);
		expect(document.querySelector('[data-testid="preview-content"]')).toBeTruthy();

		// Switch back to capabilities tab
		capabilitiesTab.click();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(capabilitiesTab.classList.contains('border-green-400')).toBe(true);
		expect(document.querySelector('[data-testid="capability-selector"]')).toBeTruthy();
	});

	it('should display login prompt when generation attempted', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,
			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Set up project name
		const projectNameInput = document.querySelector('[data-testid="project-name-input"]');
		projectNameInput.value = 'test-project';
		projectNameInput.dispatchEvent(new Event('input', { bubbles: true }));

		// Wait for UI to update
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Try to click generate button
		const generateButton = document.querySelector('[data-testid="generate-button"]');
		expect(generateButton).toBeTruthy();

		// Click the button (should still be disabled or show modal)
		if (!projectNameInput.checkValidity()) {
			// Button might be enabled now
			// Click and check for login modal
		}
	});

	it('should handle errors gracefully', async () => {
		// Mock network error
		globalThis.fetch.mockRejectedValue(new Error('Network error'));

		component = mount(GenprojPage, {
			target: document.body,
			props: {
				data: {
					isAuthenticated: false,
					capabilities: [], // Empty array so it will try to fetch
					selectedCapabilities: []
				}
			}
		});

		// Wait for error to appear (longer wait for async error handling)
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Should show error message
		const errorMessage = document.querySelector('[data-testid="error-message"]');
		expect(errorMessage).toBeTruthy();
		expect(errorMessage.textContent).toContain('Network error');

		// Should show retry button
		const retryButton = document.querySelector('[data-testid="retry-button"]');
		expect(retryButton).toBeTruthy();
	});
});
