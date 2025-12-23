import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import SpeckitDev from '../../../../src/routes/projects/speckit-dev/speckit-dev.svx';

// Mock components
vi.mock('$lib/components/ProjectLinkButton.svelte', () => ({
	default: vi.fn()
}));

vi.mock('@zerodevx/svelte-img', () => ({
	default: vi.fn()
}));

describe('SpeckitDev Article', () => {
	it('renders the new caption', () => {
		render(SpeckitDev, { data: {} });
		expect(
			screen.getByText(/Although this captures my sentiment at times using Spec Kit/)
		).toBeTruthy();
	});
});
