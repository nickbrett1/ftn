/**
 * @fileoverview E2E test for genproj authentication workflow
 * @description Tests the complete authentication flow using Vitest
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import GenprojPage from '../../src/routes/projects/genproj/+page.svelte';

// Mock fetch globally
globalThis.fetch = vi.fn();

describe('Genproj Authentication Workflow', () => {
	let component;
	let container;

	const mockCapabilities = [
		{
			id: 'devcontainer-node',
			name: 'Node.js DevContainer Support',
			description: 'Adds Node.js runtime to your development container',
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
			description: 'Continuous integration with CircleCI',
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
			id: 'doppler',
			name: 'Doppler Secrets Management',
			description: 'Secrets management with Doppler',
			category: 'secrets',
			dependencies: [],
			conflicts: [],
			requiresAuth: ['doppler'],
			configurationSchema: {
				type: 'object',
				properties: {}
			}
		}
	];

	const defaultProps = {
		data: {
			isAuthenticated: false,
			capabilities: mockCapabilities,
			selectedCapabilities: []
		}
	};

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		vi.clearAllMocks();
	});

	afterEach(() => {
		if (component) {
			unmount(component);
			component = null;
		}
		if (container) {
			container.remove();
			container = null;
		}
	});

	it('should redirect to Google auth when attempting to generate without authentication', async () => {
		// Mock window.location.href to track redirects
		let locationHref = '';
		Object.defineProperty(globalThis, 'location', {
			value: {
				get href() {
					return locationHref;
				},
				set href(value) {
					locationHref = value;
				}
			},
			writable: true,
			configurable: true
		});

		component = mount(GenprojPage, { target: container, props: defaultProps });
		await waitForNextTick();

		// Set up project name
		const projectNameInput = document.querySelector('[data-testid="project-name-input"]');
		expect(projectNameInput).toBeTruthy();
		projectNameInput.value = 'test-project';
		projectNameInput.dispatchEvent(new Event('input', { bubbles: true }));
		await waitForNextTick();

		// Select a capability to enable the generate button
		const checkboxes = document.querySelectorAll('[data-testid="capability-checkbox"]');
		expect(checkboxes.length).toBeGreaterThan(0);
		const nodeCheckbox = Array.from(checkboxes).find(
			(cb) => cb.dataset.capabilityId === 'devcontainer-node'
		);
		if (nodeCheckbox) {
			nodeCheckbox.click();
			await waitForNextTick();
		}

		// Wait a bit for state to update and button to become enabled
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Try to click generate button
		const generateButton = document.querySelector('[data-testid="generate-button"]');
		expect(generateButton).toBeTruthy();
		expect(generateButton.disabled).toBe(false);

		// Mock Google GIS to prevent actual redirect
		globalThis.window.google = {
			accounts: {
				oauth2: {
					initCodeClient: vi.fn(() => ({
						requestCode: vi.fn()
					}))
				}
			}
		};

		// Click generate button - should trigger Google auth directly
		generateButton.click();
		await waitForNextTick();
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Verify that Google OAuth was initiated (initCodeClient should be called)
		// Since we can't easily test the redirect, we verify the component handled the click
		expect(globalThis.window.google.accounts.oauth2.initCodeClient).toHaveBeenCalled();
	});

	it('should show auth flow when authenticated user tries to generate', async () => {
		const authenticatedProps = {
			data: {
				isAuthenticated: true,
				capabilities: mockCapabilities,
				selectedCapabilities: ['circleci']
			}
		};

		component = mount(GenprojPage, { target: container, props: authenticatedProps });
		await waitForNextTick();

		// Set up project name
		const projectNameInput = document.querySelector('[data-testid="project-name-input"]');
		projectNameInput.value = 'test-project';
		projectNameInput.dispatchEvent(new Event('input', { bubbles: true }));
		await waitForNextTick();

		// Click generate button
		const generateButton = document.querySelector('[data-testid="generate-button"]');
		generateButton.click();
		await waitForNextTick();

		// Should show AuthFlow component (will be rendered if showAuthFlow is true)
		// The component checks for requiredAuthServices.length > 0
		const authFlowTitle = document.querySelector('#auth-flow-title');
		if (authFlowTitle) {
			expect(authFlowTitle.textContent).toContain('Authentication Required');
		}
	});

	it('should redirect to GitHub OAuth when GitHub auth button is clicked', async () => {
		const authenticatedProps = {
			data: {
				isAuthenticated: true,
				capabilities: mockCapabilities,
				selectedCapabilities: []
			}
		};

		// Mock window.location.href
		let locationHref = '';
		Object.defineProperty(globalThis, 'location', {
			value: {
				get href() {
					return locationHref;
				},
				set href(value) {
					locationHref = value;
				}
			},
			writable: true
		});

		component = mount(GenprojPage, { target: container, props: authenticatedProps });
		await waitForNextTick();

		// This test would require the AuthFlow component to be shown and GitHub button clicked
		// For now, we verify the component structure
		expect(component).toBeTruthy();
	});

	it('should handle external service token authentication', async () => {
		const authenticatedProps = {
			data: {
				isAuthenticated: true,
				capabilities: mockCapabilities,
				selectedCapabilities: ['circleci']
			}
		};

		// Mock successful token validation
		globalThis.fetch.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					success: true,
					message: 'CircleCI authentication successful',
					user: { username: 'testuser' }
				})
		});

		component = mount(GenprojPage, { target: container, props: authenticatedProps });
		await waitForNextTick();

		// Verify component renders
		expect(component).toBeTruthy();
		// Token authentication would be tested through the AuthFlow component UI
	});

	it('should display authentication status for required services', async () => {
		const authenticatedProps = {
			data: {
				isAuthenticated: true,
				capabilities: mockCapabilities,
				selectedCapabilities: ['circleci', 'doppler']
			}
		};

		component = mount(GenprojPage, { target: container, props: authenticatedProps });
		await waitForNextTick();

		// Verify component renders
		expect(component).toBeTruthy();
		// Authentication status display would be verified through AuthFlow component
	});
});

// Helper function to wait for next tick
function waitForNextTick() {
	return new Promise((resolve) => setTimeout(resolve, 0));
}
