import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import AdminPage from '../../src/routes/projects/ccbilling/admin/+page.svelte';

// Mock the Button component
vi.mock('$lib/components/Button.svelte', () => ({
	default: vi.fn().mockImplementation(({ children, onclick, href, variant, size, disabled }) => {
		const button = document.createElement('button');
		button.textContent = children;
		button.onclick = onclick || (() => {});
		button.href = href;
		button.variant = variant;
		button.size = size;
		button.disabled = disabled;
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
		
		expect(screen.getByText('Admin Tools')).toBeInTheDocument();
		expect(screen.getByText('Database Normalization')).toBeInTheDocument();
		expect(screen.getByText('Run the merchant normalization process across all payment records.')).toBeInTheDocument();
	});

	it('should render the Run Normalization button', () => {
		render(AdminPage);
		
		const button = screen.getByText('Run Normalization');
		expect(button).toBeInTheDocument();
		expect(button.disabled).toBe(false);
	});

	it('should render the Back to Billing Cycles button', () => {
		render(AdminPage);
		
		const backButton = screen.getByText('Back to Billing Cycles');
		expect(backButton).toBeInTheDocument();
		expect(backButton.href).toBe('/projects/ccbilling');
	});

	it('should show loading state when normalization is running', async () => {
		render(AdminPage);
		
		const button = screen.getByText('Run Normalization');
		fireEvent.click(button);
		
		await tick();
		expect(screen.getByText('Running...')).toBeInTheDocument();
		expect(screen.getByText('Running...').disabled).toBe(true);
	});

	it('should call the normalization API when button is clicked', async () => {
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ paymentsUpdated: 21 })
		});

		render(AdminPage);
		
		const button = screen.getByText('Run Normalization');
		fireEvent.click(button);
		
		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith('/api/admin/normalize-merchants', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ offset: 0 })
			});
		});
	});

	it('should display success message when normalization completes', async () => {
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ paymentsUpdated: 21 })
		});

		render(AdminPage);
		
		const button = screen.getByText('Run Normalization');
		fireEvent.click(button);
		
		await waitFor(() => {
			expect(screen.getByText('✅ Normalization completed successfully!')).toBeInTheDocument();
			expect(screen.getByText('Payments updated: 21')).toBeInTheDocument();
		});
	});

	it('should display error message when API call fails', async () => {
		global.fetch.mockResolvedValueOnce({
			ok: false,
			status: 401
		});

		render(AdminPage);
		
		const button = screen.getByText('Run Normalization');
		fireEvent.click(button);
		
		await waitFor(() => {
			expect(screen.getByText('❌ Error: HTTP error! status: 401')).toBeInTheDocument();
			expect(screen.getByText('This appears to be an authentication error. You may need to log in again.')).toBeInTheDocument();
		});
	});

	it('should display warnings when normalization has errors', async () => {
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ 
				paymentsUpdated: 21, 
				errors: ['Error 1', 'Error 2'] 
			})
		});

		render(AdminPage);
		
		const button = screen.getByText('Run Normalization');
		fireEvent.click(button);
		
		await waitFor(() => {
			expect(screen.getByText('Warnings: 2 issues encountered')).toBeInTheDocument();
		});
	});

	it('should handle network errors gracefully', async () => {
		global.fetch.mockRejectedValueOnce(new Error('Network error'));

		render(AdminPage);
		
		const button = screen.getByText('Run Normalization');
		fireEvent.click(button);
		
		await waitFor(() => {
			expect(screen.getByText('❌ Error: Network error')).toBeInTheDocument();
		});
	});
});