/**
 * @fileoverview E2E test for two-tab workflow in genproj feature
 * @description Tests the complete workflow of configuring capabilities and viewing preview
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

describe('Genproj Two-Tab Workflow', () => {
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
					nodeVersion: {
						type: 'string',
						enum: ['22', '20', '18'],
						default: '22'
					}
				}
			}
		},
		{
			id: 'devcontainer-python',
			name: 'Python DevContainer Support',
			description: 'Adds Python runtime to your development container',
			category: 'devcontainer',
			dependencies: [],
			conflicts: [],
			requiresAuth: [],
			configurationSchema: {
				type: 'object',
				properties: {
					pythonVersion: {
						type: 'string',
						enum: ['3.12', '3.11', '3.10'],
						default: '3.12'
					}
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
		// Create a container for the component
		container = document.createElement('div');
		document.body.appendChild(container);

		vi.clearAllMocks();
		// Mock preview API response
		globalThis.fetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					files: [
						{
							filePath: '.devcontainer/devcontainer.json',
							content: '{"name":"DevContainer"}',
							capabilityId: 'devcontainer-node',
							isExecutable: false
						}
					],
					externalServices: []
				})
		});
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

	it('should allow user to configure capabilities, view preview, and modify configuration', async () => {
		// Setup - mount component
		component = mount(GenprojPage, { target: container, props: defaultProps });
		await waitForNextTick();

		// Step 1: Enter project name
		const projectNameInput = document.querySelector('[data-testid="project-name-input"]');
		expect(projectNameInput).toBeTruthy();
		projectNameInput.value = 'my-awesome-project';
		projectNameInput.dispatchEvent(new Event('input'));

		// Step 2: Verify Capabilities tab is active by default
		const capabilitiesTab = document.querySelector('[data-testid="capabilities-tab"]');
		expect(capabilitiesTab).toBeTruthy();
		expect(capabilitiesTab.getAttribute('aria-selected')).toBe('true');

		// Step 3: Select a capability
		const checkboxes = document.querySelectorAll('[data-testid="capability-checkbox"]');
		expect(checkboxes.length).toBeGreaterThan(0);

		// Find the Node.js capability checkbox
		const nodeCheckbox = Array.from(checkboxes).find(
			(cb) => cb.dataset.capabilityId === 'devcontainer-node'
		);
		expect(nodeCheckbox).toBeTruthy();

		// Check the capability
		nodeCheckbox.click();
		await waitForNextTick();

		// Step 4: Switch to Preview tab
		const previewTab = document.querySelector('[data-testid="preview-tab"]');
		expect(previewTab).toBeTruthy();
		previewTab.click();
		await waitForNextTick();

		// Verify preview API was called
		expect(globalThis.fetch).toHaveBeenCalledWith(
			'/projects/genproj/api/preview',
			expect.objectContaining({
				method: 'POST'
			})
		);

		// Step 5: Verify preview content is shown
		const previewContent = document.querySelector('[data-testid="preview-content"]');
		expect(previewContent).toBeTruthy();

		// Step 6: Switch back to Capabilities tab
		capabilitiesTab.click();
		await waitForNextTick();

		// Verify we're back on capabilities tab
		expect(capabilitiesTab.getAttribute('aria-selected')).toBe('true');
		expect(document.querySelector('[data-testid="capability-selector"]')).toBeTruthy();

		// Step 7: Modify capability selection and view updated preview
		const pythonCheckbox = Array.from(checkboxes).find(
			(cb) => cb.dataset.capabilityId === 'devcontainer-python'
		);
		expect(pythonCheckbox).toBeTruthy();

		// Select Python capability
		pythonCheckbox.click();
		await waitForNextTick();

		// Switch to preview again
		previewTab.click();
		await waitForNextTick();

		// Verify preview API was called again with updated selection
		expect(globalThis.fetch).toHaveBeenCalledTimes(2);
	});

	it('should update preview when capabilities change', async () => {
		// Setup
		component = mount(GenprojPage, { target: container, props: defaultProps });
		await waitForNextTick();

		// Enter project name
		const projectNameInput = document.querySelector('[data-testid="project-name-input"]');
		projectNameInput.value = 'test-project';
		projectNameInput.dispatchEvent(new Event('input'));

		// Select first capability
		const checkboxes = document.querySelectorAll('[data-testid="capability-checkbox"]');
		const nodeCheckbox = Array.from(checkboxes).find(
			(cb) => cb.dataset.capabilityId === 'devcontainer-node'
		);
		nodeCheckbox.click();
		await waitForNextTick();

		// Switch to preview
		const previewTab = document.querySelector('[data-testid="preview-tab"]');
		previewTab.click();
		await waitForNextTick();

		// Verify first preview call
		const firstCall = globalThis.fetch.mock.calls[0];
		expect(firstCall[0]).toBe('/projects/genproj/api/preview');
		const firstRequestBody = JSON.parse(firstCall[1].body);
		expect(firstRequestBody.selectedCapabilities).toEqual(['devcontainer-node']);

		// Switch back to capabilities
		const capabilitiesTab = document.querySelector('[data-testid="capabilities-tab"]');
		capabilitiesTab.click();
		await waitForNextTick();

		// Select additional capability - re-query checkboxes after tab switch
		const checkboxesAfterSwitch = document.querySelectorAll('[data-testid="capability-checkbox"]');
		const pythonCheckbox = Array.from(checkboxesAfterSwitch).find(
			(cb) => cb.dataset.capabilityId === 'devcontainer-python'
		);
		pythonCheckbox.click();
		await waitForNextTick();

		// Switch to preview again
		previewTab.click();
		await waitForNextTick();

		// Verify second preview call with updated selection
		const secondCall = globalThis.fetch.mock.calls[1];
		expect(secondCall[0]).toBe('/projects/genproj/api/preview');
		const secondRequestBody = JSON.parse(secondCall[1].body);
		expect(secondRequestBody.selectedCapabilities.length).toBeGreaterThan(1);
	});

	it('should show empty state message in preview when no capabilities selected', async () => {
		// Setup
		component = mount(GenprojPage, { target: container, props: defaultProps });
		await waitForNextTick();

		// Enter project name but don't select capabilities
		const projectNameInput = document.querySelector('[data-testid="project-name-input"]');
		projectNameInput.value = 'test-project';
		projectNameInput.dispatchEvent(new Event('input'));

		// Switch to preview
		const previewTab = document.querySelector('[data-testid="preview-tab"]');
		previewTab.click();
		await waitForNextTick();

		// Verify empty state or error message is shown
		const previewContent = document.querySelector('[data-testid="preview-content"]');
		expect(previewContent).toBeTruthy();
	});

	it('should show visual feedback when switching tabs', async () => {
		// Setup
		component = mount(GenprojPage, { target: container, props: defaultProps });
		await waitForNextTick();

		// Verify initial tab styling
		const capabilitiesTab = document.querySelector('[data-testid="capabilities-tab"]');
		const previewTab = document.querySelector('[data-testid="preview-tab"]');

		// Capabilities tab should be active initially
		expect(capabilitiesTab.className).toContain('border-green-400');

		// Switch to preview
		previewTab.click();
		await waitForNextTick();

		// Preview tab should be active
		expect(previewTab.className).toContain('border-green-400');
		expect(capabilitiesTab.className).not.toContain('border-green-400');
	});
});

// Helper function to wait for next tick
function waitForNextTick() {
	return new Promise((resolve) => setTimeout(resolve, 0));
}
