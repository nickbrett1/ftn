import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AdminPage from '../../src/routes/projects/ccbilling/admin/+page.svelte';

// Mock the Button component (using the exact working mock from billing cycle test)
vi.mock('$lib/components/Button.svelte', () => ({
	default: vi.fn().mockImplementation(({ children, onclick, class: className }) => {
		const button = document.createElement('button');
		button.textContent = children;
		button.onclick = onclick || (() => {});
		if (className) button.className = className;
		return button;
	})
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('CCBilling Admin Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the admin page with correct title and description', () => {
		render(AdminPage);
		
		expect(screen.getByText('Admin Tools')).toBeTruthy();
		expect(screen.getByText('Database Normalization')).toBeTruthy();
		expect(screen.getByText('Run the merchant normalization process across all payment records. This will ensure all merchant names are consistently normalized.')).toBeTruthy();
	});

	it('should have the correct page structure', () => {
		render(AdminPage);
		
		// Check that the main elements are present
		expect(screen.getByText('Admin Tools')).toBeTruthy();
		expect(screen.getByText('Database Normalization')).toBeTruthy();
		
		// Check that the page has the expected layout classes
		const main = document.querySelector('main');
		expect(main).toBeTruthy();
		expect(main.className).toContain('container');
		expect(main.className).toContain('mx-auto');
	});

	it('should have the expected page content structure', () => {
		render(AdminPage);
		
		// Check that the main content area exists
		const contentArea = document.querySelector('.bg-gray-800.border.border-gray-700.rounded-lg.p-6');
		expect(contentArea).toBeTruthy();
		
		// Check that the description text is present
		expect(screen.getByText('Run the merchant normalization process across all payment records. This will ensure all merchant names are consistently normalized.')).toBeTruthy();
	});

	it('should have the correct layout structure', () => {
		render(AdminPage);
		
		// Check that the page has the expected layout structure
		const headerSection = document.querySelector('.flex.items-center.justify-between.mb-8');
		expect(headerSection).toBeTruthy();
		
		// Check that the title is in the header section
		const title = headerSection.querySelector('h1');
		expect(title).toBeTruthy();
		expect(title.textContent).toBe('Admin Tools');
	});
});