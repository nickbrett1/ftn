import { render, fireEvent, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import CapabilitySelector from '$lib/components/genproj/CapabilitySelector.svelte';

// Mock tippy.js
vi.mock('tippy.js', () => ({
	default: vi.fn(() => ({
		setContent: vi.fn(),
		destroy: vi.fn()
	}))
}));

describe('CapabilitySelector', () => {
	const capabilities = [
		{
			id: 'sonarcloud',
			name: 'SonarCloud Code Quality',
			description: 'Sets up SonarCloud for static code analysis.',
			category: 'code-quality',
			dependencies: [],
			conflicts: [],
			requiresAuth: ['sonarcloud'],
			externalServices: [],
			configurationSchema: {},
			templates: []
		},
		{
			id: 'sonarlint',
			name: 'SonarLint',
			description: 'Configures SonarLint for local code quality analysis.',
			category: 'code-quality',
			dependencies: ['sonarcloud'],
			conflicts: [],
			requiresAuth: [],
			configurationSchema: {},
			templates: []
		}
	];

	it('locks dependency when parent capability is selected', async () => {
		// Initial state: nothing selected
		const { rerender } = render(CapabilitySelector, {
			capabilities,
			selectedCapabilities: [],
			configuration: {}
		});

		// Simulate selection state update
		await rerender({
			capabilities,
			selectedCapabilities: ['sonarlint', 'sonarcloud'],
			configuration: {}
		});

		// Check if SonarCloud is disabled
		const sonarcloudCheckbox = screen.getByLabelText('SonarCloud Code Quality');
		expect(sonarcloudCheckbox.disabled).toBe(true);

		// Check for the warning message (which IS present in the component)
		const warningMessage = screen.getByText(
			'Required by another selected capability. Cannot deselect.'
		);
		expect(warningMessage).toBeTruthy();

		// Check for the visual lock icon using test id
		const lockIcon = screen.getByTestId('lock-icon');
		expect(lockIcon).toBeTruthy();
	});
});
