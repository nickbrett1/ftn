import { render, screen } from '@testing-library/svelte';
import { expect } from 'vitest';
import '@testing-library/jest-dom';
import HeatmapLegend from './HeatmapLegend.svelte';

describe('HeatmapLegend', () => {
	it('should render the legend title', () => {
		render(HeatmapLegend);
		expect(screen.getByText('Market Heatmap Legend')).toBeInTheDocument();
	});

	it('should display positive changes section', () => {
		render(HeatmapLegend);
		expect(screen.getByText('Positive Changes (Green)')).toBeInTheDocument();
	});

	it('should display negative changes section', () => {
		render(HeatmapLegend);
		expect(screen.getByText('Negative Changes (Red)')).toBeInTheDocument();
	});

	it('should show color scale for positive changes', () => {
		render(HeatmapLegend);
		expect(screen.getByText('0% to 2%')).toBeInTheDocument();
		expect(screen.getByText('2% to 5%')).toBeInTheDocument();
		expect(screen.getByText('5% to 10%')).toBeInTheDocument();
		expect(screen.getByText('10%+')).toBeInTheDocument();
	});

	it('should show color scale for negative changes', () => {
		render(HeatmapLegend);
		expect(screen.getByText('0% to -2%')).toBeInTheDocument();
		expect(screen.getByText('-2% to -5%')).toBeInTheDocument();
		expect(screen.getByText('-5% to -10%')).toBeInTheDocument();
		expect(screen.getByText('-10%+')).toBeInTheDocument();
	});

	it('should display visual elements explanation', () => {
		render(HeatmapLegend);
		expect(screen.getByText('Column Height = Price Change %')).toBeInTheDocument();
		expect(screen.getByText('Column Area = Market Cap')).toBeInTheDocument();
		expect(screen.getByText('Grouped by Sector')).toBeInTheDocument();
	});

	it('should display interactive controls info', () => {
		render(HeatmapLegend);
		expect(screen.getByText('🖱️ Drag to rotate view')).toBeInTheDocument();
		expect(screen.getByText('🔍 Scroll to zoom')).toBeInTheDocument();
		expect(screen.getByText('👆 Hover for details')).toBeInTheDocument();
	});

	it('should have proper styling classes', () => {
		const { container } = render(HeatmapLegend);
		const legendElement = container.querySelector('.bg-black');
		expect(legendElement).toBeInTheDocument();
		expect(legendElement).toHaveClass('bg-opacity-90', 'rounded-lg', 'border', 'border-zinc-700');
	});

	it('should display sector information', () => {
		render(HeatmapLegend);
		expect(screen.getByText('Grouped by Sector')).toBeInTheDocument();
	});
});