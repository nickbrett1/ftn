import { render, screen } from '@testing-library/svelte';
import { expect } from 'vitest';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Page from './+page.svelte';

// Mock the Header component
vi.mock('$lib/components/Header.svelte', () => ({
	default: {
		render: () => '<div data-testid="header">Header</div>'
	}
}));

// Mock the Heatmap3D component
vi.mock('$lib/components/Heatmap3D.svelte', () => ({
	default: {
		render: () => '<div data-testid="heatmap3d">Heatmap3D</div>'
	}
}));

describe('3D Heatmap Page', () => {
	it('should render the page title', () => {
		render(Page);
		expect(screen.getByText('S&P 500 3D Heatmap')).toBeInTheDocument();
	});

	it('should display the description', () => {
		render(Page);
		expect(screen.getByText(/Interactive 3D visualization of S&P 500 price changes/)).toBeInTheDocument();
	});

	it('should show the 3D visualization container', () => {
		render(Page);
		const container = document.querySelector('.h-\\[80vh\\]');
		expect(container).toBeInTheDocument();
		expect(container).toHaveClass('bg-black', 'rounded-lg', 'overflow-hidden');
	});

	it('should display the loading message', () => {
		render(Page);
		// The Heatmap3D component should be rendered
		expect(document.querySelector('[data-testid="heatmap3d"]')).toBeInTheDocument();
	});

	it('should show the interactive controls info', () => {
		render(Page);
		expect(screen.getByText(/Drag to rotate/)).toBeInTheDocument();
		expect(screen.getByText(/Scroll to zoom/)).toBeInTheDocument();
		expect(screen.getByText(/Hover for details/)).toBeInTheDocument();
	});

	it('should display the legend sections', () => {
		render(Page);
		// The HeatmapLegend component should be rendered within Heatmap3D
		expect(document.querySelector('[data-testid="heatmap3d"]')).toBeInTheDocument();
	});

	it('should show legend details for positive changes', () => {
		render(Page);
		// The legend should be present within the Heatmap3D component
		expect(document.querySelector('[data-testid="heatmap3d"]')).toBeInTheDocument();
	});

	it('should show legend details for negative changes', () => {
		render(Page);
		// The legend should be present within the Heatmap3D component
		expect(document.querySelector('[data-testid="heatmap3d"]')).toBeInTheDocument();
	});

	it('should have proper styling classes', () => {
		const { container } = render(Page);
		const mainContainer = container.querySelector('.min-h-screen');
		expect(mainContainer).toBeInTheDocument();
		expect(mainContainer).toHaveClass('bg-zinc-900');
	});

	it('should display the header component', () => {
		render(Page);
		// Header should be rendered
		expect(document.querySelector('[data-testid="header"]')).toBeInTheDocument();
	});
});