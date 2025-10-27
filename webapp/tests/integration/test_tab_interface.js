/**
 * @fileoverview Integration test for tab switching interface
 * @description Tests the tab switching behavior in genproj feature
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import GenprojPage from '../../src/routes/projects/genproj/+page.svelte';

// Mock fetch
globalThis.fetch = vi.fn();

describe('Tab Interface Integration', () => {
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
		vi.clearAllMocks();

		// Mock preview API response
		globalThis.fetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					files: [
						{
							filePath: '.devcontainer/devcontainer.json',
							content: '{"name":"Node.js DevContainer"}',
							capabilityId: 'devcontainer-node',
							isExecutable: false
						}
					],
					externalServices: []
				})
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should display both tabs (Capabilities and Preview)', async () => {
		// Act
		render(GenprojPage, { props: defaultProps });
		await waitFor(() => {
			expect(screen.getByTestId('capabilities-tab')).toBeInTheDocument();
			expect(screen.getByTestId('preview-tab')).toBeInTheDocument();
		});

		// Assert
		const capabilitiesTab = screen.getByTestId('capabilities-tab');
		const previewTab = screen.getByTestId('preview-tab');

		expect(capabilitiesTab).toHaveTextContent('Capabilities');
		expect(previewTab).toHaveTextContent('Preview');
	});

	it('should start with Capabilities tab active', async () => {
		// Act
		render(GenprojPage, { props: defaultProps });

		// Assert
		const capabilitiesTab = screen.getByTestId('capabilities-tab');
		expect(capabilitiesTab).toHaveAttribute('aria-selected', 'true');
	});

	it('should switch to Preview tab when clicked', async () => {
		// Arrange
		render(GenprojPage, { props: defaultProps });

		// Act
		const previewTab = screen.getByTestId('preview-tab');
		await fireEvent.click(previewTab);

		// Assert
		expect(previewTab).toHaveAttribute('aria-selected', 'true');
		const capabilitiesTab = screen.getByTestId('capabilities-tab');
		expect(capabilitiesTab).toHaveAttribute('aria-selected', 'false');
	});

	it('should switch back to Capabilities tab when clicked', async () => {
		// Arrange
		render(GenprojPage, { props: defaultProps });

		const previewTab = screen.getByTestId('preview-tab');
		await fireEvent.click(previewTab);

		// Act
		const capabilitiesTab = screen.getByTestId('capabilities-tab');
		await fireEvent.click(capabilitiesTab);

		// Assert
		expect(capabilitiesTab).toHaveAttribute('aria-selected', 'true');
		expect(previewTab).toHaveAttribute('aria-selected', 'false');
	});

	it('should display capability selector content when Capabilities tab is active', async () => {
		// Act
		render(GenprojPage, { props: defaultProps });

		// Assert
		const selector = screen.getByTestId('capability-selector');
		expect(selector).toBeInTheDocument();
	});

	it('should display preview content when Preview tab is active', async () => {
		// Arrange
		render(GenprojPage, {
			props: {
				...defaultProps,
				data: {
					...defaultProps.data,
					capabilities: mockCapabilities
				}
			}
		});

		// Act - switch to preview tab
		const previewTab = screen.getByTestId('preview-tab');
		await fireEvent.click(previewTab);

		// Assert
		await waitFor(() => {
			const previewContent = screen.getByTestId('preview-content');
			expect(previewContent).toBeInTheDocument();
		});
	});

	it('should call preview API when switching to Preview tab', async () => {
		// Arrange
		render(GenprojPage, {
			props: {
				...defaultProps,
				data: {
					...defaultProps.data,
					selectedCapabilities: ['devcontainer-node'],
					capabilities: mockCapabilities
				}
			}
		});

		// Act - fill project name and switch to preview
		const projectNameInput = screen.getByTestId('project-name-input');
		await fireEvent.input(projectNameInput, { target: { value: 'my-app' } });

		const previewTab = screen.getByTestId('preview-tab');
		await fireEvent.click(previewTab);

		// Assert
		await waitFor(() => {
			expect(globalThis.fetch).toHaveBeenCalledWith(
				'/projects/genproj/api/preview',
				expect.objectContaining({
					method: 'POST'
				})
			);
		});
	});

	it('should maintain tab state when switching between tabs', async () => {
		// Arrange
		render(GenprojPage, { props: defaultProps });

		// Act - switch back and forth
		const capabilitiesTab = screen.getByTestId('capabilities-tab');
		const previewTab = screen.getByTestId('preview-tab');

		await fireEvent.click(previewTab);
		expect(previewTab).toHaveAttribute('aria-selected', 'true');

		await fireEvent.click(capabilitiesTab);
		expect(capabilitiesTab).toHaveAttribute('aria-selected', 'true');

		await fireEvent.click(previewTab);
		expect(previewTab).toHaveAttribute('aria-selected', 'true');
	});

	it('should show visual indicators for active tab', async () => {
		// Act
		render(GenprojPage, { props: defaultProps });

		// Assert - capabilities tab should have active styling initially
		const capabilitiesTab = screen.getByTestId('capabilities-tab');
		expect(capabilitiesTab.className).toContain('border-green-400');
		expect(capabilitiesTab.className).toContain('text-green-400');

		// Act - switch to preview
		const previewTab = screen.getByTestId('preview-tab');
		await fireEvent.click(previewTab);

		// Assert - preview tab should have active styling
		expect(previewTab.className).toContain('border-green-400');
		expect(previewTab.className).toContain('text-green-400');

		// Assert - capabilities tab should have inactive styling
		expect(capabilitiesTab.className).not.toContain('border-green-400');
		expect(capabilitiesTab.className).toContain('text-gray-400');
	});
});
