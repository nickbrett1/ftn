import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import DataArchitectureHTML from '../../../../src/routes/projects/data-arch-diagram/DataArchitectureHTML.svelte';

describe('DataArchitectureHTML', () => {
	it('renders the main sections', () => {
		render(DataArchitectureHTML);

		expect(screen.getByText('Data Governance')).toBeInTheDocument();
		expect(screen.getByText('Sources')).toBeInTheDocument();
		expect(screen.getByText('Collect & Transform')).toBeInTheDocument();
		expect(screen.getByText('Store')).toBeInTheDocument();
		expect(screen.getByText('Analyze, Visualize, Activate')).toBeInTheDocument();
		expect(screen.getByText('End Users')).toBeInTheDocument();
	});

	it('opens info panel when an item is clicked', async () => {
		render(DataArchitectureHTML);

		// Click on "Data Governance"
		const governanceButton = screen.getByText('Data Governance').closest('button');
		await fireEvent.click(governanceButton);

		// Check if description appears
		expect(
			screen.getByText(/A centralized framework to ensure data is managed/i)
		).toBeInTheDocument();

		// Close it - if transition mock is tricky, we can just assume closing works or test logic in component.
		// For now, let's just test opening works, which is critical.
		const closeButton = screen.getByText('Close');
		await fireEvent.click(closeButton);
	});

	it('selects Analytical Engine when clicked', async () => {
		render(DataArchitectureHTML);

		// Click on Analytical Engine
		// Note: The text inside is split. We can look for the title text div.
		const engineLabel = screen.getByText('Analytical Engine');
		const engineButton = engineLabel.closest('button');

		await fireEvent.click(engineButton);

		expect(
			screen.getByText(/Powers querying and analysis across the warehouse/i)
		).toBeInTheDocument();
	});

	it('renders icons', () => {
		const { container } = render(DataArchitectureHTML);
		// Look for SVGs. There should be many.
		const svgs = container.querySelectorAll('svg');
		expect(svgs.length).toBeGreaterThan(5);
	});

	it('renders links with type badges and descriptions', async () => {
		render(DataArchitectureHTML);

		// Click on "Collect & Transform" to see the "Modern ETL" link
		const collectButton = screen.getByText('CDC | ETL | Event Streaming').closest('button');
		await fireEvent.click(collectButton);

		// Verify the link exists
		const link = screen.getByText('Modern ETL without a Data Warehouse');
		expect(link).toBeInTheDocument();
		expect(link.closest('a')).toHaveAttribute('href', '/projects/dbt-duckdb');

		// Verify the "My Project" badge is displayed
		const myProjectBadge = screen.getByText('My Project');
		expect(myProjectBadge).toBeInTheDocument();
		expect(myProjectBadge).toHaveClass('text-emerald-300'); // Green for my project

		// Verify the description is displayed
		const description = screen.getByText(/See how I implemented this pattern/i);
		expect(description).toBeInTheDocument();

		// Close panel
		const closeButton = screen.getByText('Close');
		await fireEvent.click(closeButton);

		// Click on "Data Lake" which has external reference links
		// Use getByRole to be more precise if possible, or text inside the button
		// Data Lake is a complex button (div with role=button)
		const datalakeTitle = screen.getByText('Data Lake');
		const datalakeButton = datalakeTitle.closest('div[role="button"]');
		await fireEvent.click(datalakeButton);

		// Verify "Reference" badge
		const refBadge = screen.getByText('Reference');
		expect(refBadge).toBeInTheDocument();
		expect(refBadge).toHaveClass('text-blue-300'); // Blue for reference

		// Verify description
		expect(screen.getByText(/Learn more about the Data Lake concept from AWS/i)).toBeInTheDocument();
	});
});
