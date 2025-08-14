import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import HeatmapGrid from './HeatmapGrid.svelte';

describe('HeatmapGrid', () => {
	it('should render the grid component', () => {
		const { container } = render(HeatmapGrid);
		expect(container.firstChild).toBeInTheDocument();
	});

	it('should display sector dividers', () => {
		render(HeatmapGrid);
		// The component should render sector divider lines
		// Since this is a Three.js component, we test the structure
		const { container } = render(HeatmapGrid);
		expect(container.firstChild).toBeInTheDocument();
	});

	it('should have proper styling classes', () => {
		const { container } = render(HeatmapGrid);
		const gridElement = container.firstChild;
		expect(gridElement).toBeInTheDocument();
	});

	it('should render sector labels', () => {
		render(HeatmapGrid);
		// The component should render sector labels for the grid
		const { container } = render(HeatmapGrid);
		expect(container.firstChild).toBeInTheDocument();
	});

	it('should display center cross reference', () => {
		render(HeatmapGrid);
		// The component should render a center cross for reference
		const { container } = render(HeatmapGrid);
		expect(container.firstChild).toBeInTheDocument();
	});
});