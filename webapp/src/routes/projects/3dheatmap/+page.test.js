import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

// Mock the Header component since it's not available in tests
vi.mock('$lib/components/Header.svelte', () => ({
	default: {
		render: () => '<div data-testid="header">Header</div>'
	}
}));

describe('3D Heatmap Page', () => {
	it('should render the page title', () => {
		render(Page);
		expect(screen.getByText('S&P 500 3D Heatmap')).toBeInTheDocument();
	});

	it('should display the description', () => {
		render(Page);
		expect(screen.getByText(/Interactive 3D visualization of S&P 500/)).toBeInTheDocument();
		expect(screen.getByText(/Column height represents percentage change/)).toBeInTheDocument();
		expect(screen.getByText(/area represents market cap/)).toBeInTheDocument();
	});

	it('should show the 3D visualization container', () => {
		render(Page);
		const container = screen.getByRole('main') || document.querySelector('.h-\\[80vh\\]');
		expect(container).toBeInTheDocument();
	});

	it('should display the loading message', () => {
		render(Page);
		expect(screen.getByText('3D Heatmap Coming Soon')).toBeInTheDocument();
		expect(screen.getByText('Component development in progress')).toBeInTheDocument();
	});

	it('should show the interactive controls info', () => {
		render(Page);
		expect(screen.getByText(/View automatically rotates/)).toBeInTheDocument();
		expect(screen.getByText(/Columns show price changes/)).toBeInTheDocument();
		expect(screen.getByText(/Grouped by sector/)).toBeInTheDocument();
	});

	it('should display the legend sections', () => {
		render(Page);
		expect(screen.getByText('Positive Changes (Green)')).toBeInTheDocument();
		expect(screen.getByText('Negative Changes (Red)')).toBeInTheDocument();
	});

	it('should show legend details for positive changes', () => {
		render(Page);
		expect(screen.getByText('Column height = Price change percentage')).toBeInTheDocument();
		expect(screen.getByText('Column area = Market capitalization')).toBeInTheDocument();
		expect(screen.getByText('Green intensity = Higher positive change')).toBeInTheDocument();
	});

	it('should show legend details for negative changes', () => {
		render(Page);
		expect(screen.getByText('Column height = Price change percentage')).toBeInTheDocument();
		expect(screen.getByText('Column area = Market capitalization')).toBeInTheDocument();
		expect(screen.getByText('Red intensity = Higher negative change')).toBeInTheDocument();
	});

	it('should have proper styling classes', () => {
		const { container } = render(Page);
		const pageElement = container.querySelector('.min-h-screen');
		expect(pageElement).toBeInTheDocument();
		expect(pageElement).toHaveClass('bg-zinc-900');
	});

	it('should display the header component', () => {
		render(Page);
		expect(screen.getByTestId('header')).toBeInTheDocument();
	});
});