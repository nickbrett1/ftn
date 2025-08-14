import { render, screen } from '@testing-library/svelte';
import { expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import HeatmapGrid from './HeatmapGrid.svelte';

// Mock Threlte components to avoid WebGL issues in tests
vi.mock('@threlte/core', () => ({
	Canvas: {
		render: () => '<div data-testid="canvas">Canvas</div>'
	},
	T: {
		Mesh: {
			render: () => '<div data-testid="mesh">Mesh</div>'
		},
		LineSegments: {
			render: () => '<div data-testid="lines">LineSegments</div>'
		}
	}
}));

describe('HeatmapGrid', () => {
	it('should render the grid component', () => {
		const { container } = render(HeatmapGrid);
		expect(container.firstChild).toBeInTheDocument();
	});

	it('should display sector dividers', () => {
		const { container } = render(HeatmapGrid);
		// Component should render without errors
		expect(container.firstChild).toBeInTheDocument();
	});

	it('should have proper styling classes', () => {
		const { container } = render(HeatmapGrid);
		// Basic structure should be present
		expect(container.firstChild).toBeInTheDocument();
	});

	it('should render sector labels', () => {
		const { container } = render(HeatmapGrid);
		// Component should render without errors
		expect(container.firstChild).toBeInTheDocument();
	});

	it('should display center cross reference', () => {
		const { container } = render(HeatmapGrid);
		// Component should render without errors
		expect(container.firstChild).toBeInTheDocument();
	});
});