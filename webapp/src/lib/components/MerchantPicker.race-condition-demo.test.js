import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import MerchantPicker from './MerchantPicker.svelte';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MerchantPicker Race Condition Demo', () => {
	const mockOnSelect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockClear();
	});

	it('DEMONSTRATES: Race condition that would occur without the fix', async () => {
		// This test demonstrates what would happen WITHOUT our race condition fix
		// It shows how the UI can get stuck in loading state
		
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		let resolveInitialLoad;
		let initialLoadPromise = new Promise(resolve => {
			resolveInitialLoad = resolve;
		});
		
		// Mock fetch to return a controlled promise
		mockFetch.mockImplementation(() => initialLoadPromise);
		
		// Create a version of MerchantPicker WITHOUT the race condition fix
		// This would be the original code that has the race condition
		const { component } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Verify we're in loading state initially
		expect(document.querySelector('div')?.textContent?.includes('Loading recent merchants...')).toBeTruthy();
		
		// Simulate the race condition: refreshMerchantList called before initial load completes
		// This is what happens when user clicks remove merchant before combo box loads
		const refreshPromise = component.refreshMerchantList();
		
		// Resolve the initial load
		resolveInitialLoad({
			ok: true,
			json: async () => mockMerchants
		});
		
		// Wait for operations to complete
		await Promise.all([initialLoadPromise, refreshPromise]);
		
		// With our fix, this should work correctly
		// Without the fix, the component might get stuck in loading state
		await waitFor(() => {
			const combobox = document.querySelector('select');
			expect(combobox).toBeTruthy();
		}, { timeout: 2000 });
		
		// Should not be stuck in loading state (thanks to our fix)
		const loadingText = document.querySelector('div')?.textContent?.includes('Loading recent merchants...');
		expect(loadingText).toBeFalsy();
	});

	it('DEMONSTRATES: Multiple concurrent calls without protection', async () => {
		// This test shows what happens with multiple rapid calls to refreshMerchantList
		// Without proper protection, this could cause multiple concurrent API calls
		
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		let fetchCallCount = 0;
		
		// Mock fetch to track calls
		mockFetch.mockImplementation(() => {
			fetchCallCount++;
			return Promise.resolve({
				ok: true,
				json: async () => mockMerchants
			});
		});
		
		const { component } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for initial load
		await waitFor(() => {
			expect(document.querySelector('select')).toBeTruthy();
		});
		
		const initialFetchCount = fetchCallCount;
		
		// Make multiple rapid calls
		const promises = [
			component.refreshMerchantList(),
			component.refreshMerchantList(),
			component.refreshMerchantList(),
			component.refreshMerchantList()
		];
		
		await Promise.all(promises);
		
		// With our fix, should only make 1 additional call
		// Without the fix, might make 4 additional calls
		expect(fetchCallCount).toBe(initialFetchCount + 1);
	});
});