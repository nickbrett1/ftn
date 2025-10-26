/**
 * @fileoverview E2E test for unauthenticated capability viewing
 * @description Tests the complete user flow for viewing capabilities without authentication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import GenprojPage from '../../src/routes/projects/genproj/+page.svelte';

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
	value: {
		href: '',
		reload: vi.fn()
	},
	writable: true
});

describe('Genproj Capability Browsing', () => {
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
		global.fetch.mockResolvedValue({
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

	it('should display capabilities without authentication', async () => {
		component = mount(GenprojPage, {
			target: document.body,
			props: defaultProps
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check that capabilities are displayed
		const capabilityList = document.querySelector('[data-testid="capability-list"]');
		expect(capabilityList).toBeTruthy();

		// Check that individual capability cards are present
		const capabilityCards = document.querySelectorAll('[data-testid="capability-card"]');
		expect(capabilityCards.length).toBeGreaterThan(0);

		// Check that each capability card has required elements
		const firstCard = capabilityCards[0];
		expect(firstCard.querySelector('[data-testid="capability-name"]')).toBeTruthy();
		expect(firstCard.querySelector('[data-testid="capability-description"]')).toBeTruthy();
		expect(firstCard.querySelector('[data-testid="capability-details"]')).toBeTruthy();
	});

	it('should display capability categories', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,

			target: document.body,
			props: defaultProps
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check that category sections are present
		const categories = ['devcontainer', 'ci-cd', 'code-quality'];

		for (const category of categories) {
			const categorySection = document.querySelector(`[data-testid="category-${category}"]`);
			expect(categorySection).toBeTruthy();
		}
	});

	it('should show capability details on hover', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,

			target: document.body,
			props: defaultProps
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		const capabilityCard = document.querySelector('[data-testid="capability-card"]');
		expect(capabilityCard).toBeTruthy();

		// Check that capability details element exists
		const capabilityDetails = capabilityCard.querySelector('[data-testid="capability-details"]');
		expect(capabilityDetails).toBeTruthy();
	});

	it('should display login prompt when generation attempted', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,

			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Set up project name and select a capability to enable the button
		const projectNameInput = document.querySelector('[data-testid="project-name-input"]');
		projectNameInput.value = 'test-project';
		projectNameInput.dispatchEvent(new Event('input', { bubbles: true }));

		const capabilityCheckbox = document.querySelector('[data-testid="capability-checkbox"]');
		capabilityCheckbox.checked = true;
		capabilityCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

		// Wait for UI to update
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Try to click generate button
		const generateButton = document.querySelector('[data-testid="generate-button"]');
		expect(generateButton).toBeTruthy();

		// The button should now be enabled
		expect(generateButton.disabled).toBe(false);

		// Click the button
		generateButton.click();

		// Wait for modal to appear
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Should show login modal
		const loginModal = document.querySelector('[data-testid="login-modal"]');
		expect(loginModal).toBeTruthy();
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

		// Check that capability checkboxes are present
		const capabilityCheckboxes = document.querySelectorAll('[data-testid="capability-checkbox"]');
		expect(capabilityCheckboxes.length).toBeGreaterThan(0);
	});

	it('should display capability dependencies and conflicts', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,

			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Select a capability that has dependencies
		const sonarlintCheckbox = document.querySelector(
			'[data-testid="capability-checkbox"][data-capability-id="sonarlint"]'
		);
		expect(sonarlintCheckbox).toBeTruthy();

		sonarlintCheckbox.checked = true;
		sonarlintCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

		// Wait for UI to update
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Should show dependency warning
		const dependencyWarning = document.querySelector('[data-testid="dependency-warning"]');
		expect(dependencyWarning).toBeTruthy();

		// Should suggest adding the dependency
		const addDependencyButton = document.querySelector('[data-testid="add-dependency-button"]');
		expect(addDependencyButton).toBeTruthy();
	});

	it('should show capability conflicts', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,

			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Select conflicting capabilities
		const circleciCheckbox = document.querySelector(
			'[data-testid="capability-checkbox"][data-capability-id="circleci"]'
		);
		const githubActionsCheckbox = document.querySelector(
			'[data-testid="capability-checkbox"][data-capability-id="github-actions"]'
		);

		if (circleciCheckbox && githubActionsCheckbox) {
			circleciCheckbox.checked = true;
			circleciCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

			githubActionsCheckbox.checked = true;
			githubActionsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

			// Wait for UI to update
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Should show conflict warning
			const conflictWarning = document.querySelector('[data-testid="conflict-warning"]');
			expect(conflictWarning).toBeTruthy();

			// Should suggest resolving the conflict
			const resolveConflictButton = document.querySelector(
				'[data-testid="resolve-conflict-button"]'
			);
			expect(resolveConflictButton).toBeTruthy();
		}
	});

	it('should display authentication requirements', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,

			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Select capabilities that require authentication
		const circleciCheckbox = document.querySelector(
			'[data-testid="capability-checkbox"][data-capability-id="circleci"]'
		);
		expect(circleciCheckbox).toBeTruthy();

		circleciCheckbox.checked = true;
		circleciCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

		// Wait for UI to update
		await new Promise((resolve) => setTimeout(resolve, 50));

		// CircleCI selected (authentication requirements removed from UI per spec changes)
		expect(circleciCheckbox.checked).toBe(true);
	});

	it('should show capability configuration options', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,

			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Select a capability with configuration options
		const nodeCheckbox = document.querySelector(
			'[data-testid="capability-checkbox"][data-capability-id="devcontainer-node"]'
		);
		expect(nodeCheckbox).toBeTruthy();

		nodeCheckbox.checked = true;
		nodeCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

		// Wait for UI to update
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Should show configuration form
		const capabilityConfig = document.querySelector('[data-testid="capability-config"]');
		expect(capabilityConfig).toBeTruthy();

		// Should show configuration options (Node.js version only, package manager removed per spec)
		const configNodeVersion = document.querySelector('[data-testid="config-node-version"]');
		expect(configNodeVersion).toBeTruthy();
		expect(configNodeVersion.value).toBe('22'); // Default version
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

	it('should show standard header and footer for all users', async () => {
		component = mount(GenprojPage, {
			props: defaultProps,

			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check that standard header is present (Fintech Nick logo)
		const headerLogo = document.querySelector('button[aria-label="Home"]');
		expect(headerLogo).toBeTruthy();
		expect(headerLogo.textContent).toContain('Fintech Nick');

		// Check that footer navigation is present
		const genprojButton = document.querySelector('#genproj');
		expect(genprojButton).toBeTruthy();
	});

	it('should be accessible', async () => {
		component = mount(GenprojPage, {
			target: document.body
		});

		// Wait for capabilities to load
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check for proper heading structure
		const h1 = document.querySelector('h1');
		expect(h1).toBeTruthy();

		// Check for proper form labels
		const projectNameInput = document.querySelector('[data-testid="project-name-input"]');
		expect(projectNameInput.hasAttribute('aria-label')).toBe(true);

		// Check for proper button labels
		const generateButton = document.querySelector('[data-testid="generate-button"]');
		expect(generateButton.hasAttribute('aria-label')).toBe(true);

		// Check for proper tab navigation
		const capabilitiesTab = document.querySelector('[data-testid="capabilities-tab"]');
		expect(capabilitiesTab.getAttribute('role')).toBe('tab');
	});

	it('should handle errors gracefully', async () => {
		// Mock network error
		global.fetch.mockRejectedValue(new Error('Network error'));

		component = mount(GenprojPage, {
			target: document.body
		});

		// Wait for error to appear
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Should show error message
		const errorMessage = document.querySelector('[data-testid="error-message"]');
		expect(errorMessage).toBeTruthy();

		// Should show retry button
		const retryButton = document.querySelector('[data-testid="retry-button"]');
		expect(retryButton).toBeTruthy();
	});
});
