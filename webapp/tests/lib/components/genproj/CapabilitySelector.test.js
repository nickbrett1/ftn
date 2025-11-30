import { render, screen, fireEvent } from '@testing-library/svelte';
import CapabilitySelector from '$lib/components/genproj/CapabilitySelector.svelte';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { capabilities } from '$lib/config/capabilities.js';

describe('CapabilitySelector', () => {
	const mockCapabilities = capabilities;
	const mockDispatch = vi.fn();

	beforeAll(() => {
		// Mock element.animate for Svelte 5 transitions in JSDOM
		Element.prototype.animate = vi.fn().mockImplementation(() => ({
			finished: Promise.resolve(),
			onfinish: () => {},
			cancel: () => {},
			play: () => {},
			pause: () => {},
			reverse: () => {}
		}));
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders capability categories and items', () => {
		render(CapabilitySelector, {
			capabilities: mockCapabilities,
			selectedCapabilities: [],
			configuration: {}
		});

		// Check for category headers
		expect(screen.getByText('Development Containers')).toBeTruthy();
		expect(screen.getByText('CI/CD')).toBeTruthy();

		// Check for capability cards (names)
		expect(screen.getByText('Node.js DevContainer')).toBeTruthy();
	});

	it('shows benefits toggle button', async () => {
		render(CapabilitySelector, {
			capabilities: mockCapabilities,
			selectedCapabilities: [],
			configuration: {}
		});

		// Benefits toggle should be present
		const toggles = screen.getAllByText('Why use this?');
		expect(toggles.length).toBeGreaterThan(0);
	});

	it('shows configuration when selected', async () => {
		render(CapabilitySelector, {
			capabilities: mockCapabilities,
			selectedCapabilities: ['dependabot'],
			configuration: {}
		});

		expect(screen.getByText('Update Schedule')).toBeTruthy();
	});

	it('shows missing dependencies warning for gitguardian', () => {
		render(CapabilitySelector, {
			capabilities: mockCapabilities,
			selectedCapabilities: [],
			configuration: {}
		});

		// Find the GitGuardian card (or look for text within it)
		expect(screen.getByText('Requires: CircleCI Integration')).toBeTruthy();
	});
});
