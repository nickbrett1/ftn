import { render, screen } from '@testing-library/svelte';
import Page from '../../../../src/routes/projects/data-arch-diagram/+page.svelte';
import { vi, describe, it, expect } from 'vitest';

// Mock child components to avoid deep rendering issues
vi.mock('../../../../src/routes/projects/data-arch-diagram/DataArchitectureHTML.svelte', () => ({
	default: vi.fn()
}));

// Mock Header and Footer
vi.mock('$lib/components/Header.svelte', () => ({ default: vi.fn() }));
vi.mock('$lib/components/Footer.svelte', () => ({ default: vi.fn() }));

// Mock @zerodevx/svelte-img
vi.mock('@zerodevx/svelte-img', () => ({ default: vi.fn() }));

// Mock the image import
vi.mock('$lib/images/original-architecture-sketch.jpeg?as=run', () => ({
	default: 'mocked-image-src'
}));

describe('Data Arch Diagram Page', () => {
	it('does not display the goal explanation text', () => {
		render(Page);

		const explanation = screen.queryByText(
			'My goal was to build on the concepts and explain them to others.'
		);
		expect(explanation).not.toBeInTheDocument();
	});

	it('displays the title', () => {
		render(Page);
		expect(screen.getByText('Gemini 3: From Photo to Interactive Diagram')).toBeInTheDocument();
	});
});
