import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import AdminPage from '../../../src/routes/projects/ccbilling/admin/+page.svelte';

// Mock the Button component
vi.mock('$lib/components/Button.svelte', () => ({
	default: vi.fn().mockImplementation(({ children, onclick, class: className }) => {
		const button = document.createElement('button');
		button.textContent = children;
		button.addEventListener('click', onclick || (() => {}));
		if (className) button.className = className;
		return button;
	})
}));

// Mock fetch globally
globalThis.fetch = vi.fn();

describe('CCBilling Admin Page', () => {
	let component;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		if (component) {
			unmount(component);
			component = null;
		}
	});

	it('should render the admin page with correct title and description', () => {
		component = mount(AdminPage, {
			target: document.body
		});

		expect(document.body.textContent).toContain('Admin Tools');
		expect(document.body.textContent).toContain('Database Normalization');
		expect(document.body.textContent).toContain('Run the merchant normalization process');
		expect(document.body.textContent).toContain('budget assignments stay in sync');
	});

	it('should have the correct page structure', () => {
		component = mount(AdminPage, {
			target: document.body
		});

		// Check that the main elements are present
		expect(document.body.textContent).toContain('Admin Tools');
		expect(document.body.textContent).toContain('Database Normalization');

		// Check that the page has the expected layout classes
		const main = document.querySelector('main');
		expect(main).toBeTruthy();
		expect(main.className).toContain('container');
		expect(main.className).toContain('mx-auto');
	});

	it('should have the expected page content structure', () => {
		component = mount(AdminPage, {
			target: document.body
		});

		// Check that the main content area exists
		const contentArea = document.querySelector(
			'.bg-gray-800.border.border-gray-700.rounded-lg.p-6'
		);
		expect(contentArea).toBeTruthy();

		// Check that the description text is present (split across lines)
		expect(document.body.textContent).toContain('Run the merchant normalization process');
		expect(document.body.textContent).toContain('budget assignments stay in sync');
	});

	it('should have the correct layout structure', () => {
		component = mount(AdminPage, {
			target: document.body
		});

		// Check that the page has the expected layout structure
		const headerSection = document.querySelector('.flex.items-center.justify-between.mb-8');
		expect(headerSection).toBeTruthy();

		// Check that the title is in the header section
		const title = headerSection.querySelector('h1');
		expect(title).toBeTruthy();
		expect(title.textContent).toBe('Admin Tools');
	});
});