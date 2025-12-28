import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import SpeckitDevelopment from '../../../../src/routes/projects/speckit-dev/speckit-dev.svx';

// Note: Mermaid diagrams are disabled in tests (via svelte.config.js) to avoid
// a dependency on the Playwright browser.

// Mock components
vi.mock('$lib/components/ProjectLinkButton.svelte', () => ({
	default: vi.fn()
}));

vi.mock('@zerodevx/svelte-img', () => ({
	default: vi.fn()
}));

// Mock SpendChart
vi.mock('$lib/components/SpendChart.svelte', () => ({
	default: vi.fn()
}));

describe('SpeckitDev Article', () => {
	it('renders the new caption', () => {
		render(SpeckitDevelopment, { data: {} });
		expect(
			screen.getByText(/Although this captures my sentiment at times using Spec Kit/)
		).toBeTruthy();
	});
});
