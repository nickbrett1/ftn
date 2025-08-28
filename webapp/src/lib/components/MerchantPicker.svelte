<script>
	import { onMount } from 'svelte';
	import MerchantSelectionModal from './MerchantSelectionModal.svelte';

	const {
		selectedMerchant = '',
		onSelect = () => {},
		placeholder = 'Select a merchant...'
	} = $props();

	// Simple non-reactive variables - no $state to avoid reactive loops
	let allUnassignedMerchants = []; // All unassigned merchants from server
	let merchants = []; // Currently displayed merchants
	let isLoading = true; // Loading state
	let error = ''; // Error state
	let isUpdatingUI = false; // Flag to prevent recursive event handling
	
	// Only use $state for variables that directly affect UI reactivity
	let showModal = $state(false); // Modal visibility - needs to be reactive for isOpen prop
	let localSelectedMerchant = selectedMerchant; // Local selection - no longer reactive to avoid loops
	
	// DOM references for manual updates
	let merchantsSelect;
	let loadingElement;
	let errorElement;
	let emptyStateElement;

	async function loadUnassignedMerchants() {
		try {
			isLoading = true;
			error = '';
			updateLoadingUI();

			const response = await fetch('/projects/ccbilling/budgets/recent-merchants');

			// Add safety check for response
			if (!response) {
				throw new Error('No response received from server');
			}

			if (!response.ok) {
				throw new Error(`Failed to load recent merchants: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			
			allUnassignedMerchants = Array.isArray(data) ? data.sort((a, b) => a.localeCompare(b)) : [];
			
			// Show the first 20 merchants (they're already sorted by recency from the server)
			merchants = allUnassignedMerchants.slice(0, 20);
			
			updateMerchantsUI();
			updateEmptyStateUI();
		} catch (err) {
			error = err.message || 'Failed to load merchants';
			updateErrorUI();
			updateEmptyStateUI();
		} finally {
			isLoading = false;
			updateLoadingUI();
			updateEmptyStateUI();
		}
	}

	function handleSelect(event) {
		// Prevent recursive calls when we're updating the UI
		if (isUpdatingUI) {
			return;
		}
		
		const selectedValue = event.target.value;
		
		if (selectedValue) {
			// Update local selection to match the combo box selection
			localSelectedMerchant = selectedValue;
			onSelect(selectedValue);
			// Add a small delay to ensure any database changes are committed
			setTimeout(() => {
				// Refresh the merchant list to ensure it's up to date
				// This helps when the merchant might be added to auto-assignment
				loadUnassignedMerchants();
			}, 100);
		}
	}

	// Manual UI update functions to avoid reactive state
	function updateLoadingUI() {
		if (loadingElement && loadingElement.style) {
			loadingElement.textContent = isLoading ? 'Loading Recent Merchants...' : '';
			loadingElement.style.display = isLoading ? 'block' : 'none';
		}
	}
	
	function updateErrorUI() {
		if (errorElement && errorElement.style) {
			errorElement.textContent = error ? `Error: ${error}` : '';
			errorElement.style.display = error ? 'block' : 'none';
		}
	}
	
	function updateEmptyStateUI() {
		if (emptyStateElement && emptyStateElement.style) {
			const shouldShow = !isLoading && !error && merchants.length === 0;
			emptyStateElement.style.display = shouldShow ? 'block' : 'none';
		}
	}
	
	function updateMerchantsUI() {
		if (merchantsSelect && merchantsSelect.children) {
			// Set flag to prevent recursive event handling
			isUpdatingUI = true;
			
			// Clear existing options except the first one
			while (merchantsSelect.children.length > 1) {
				merchantsSelect.removeChild(merchantsSelect.lastChild);
			}
			
			// Add merchant options
			merchants.forEach(merchant => {
				const option = document.createElement('option');
				option.value = merchant;
				option.textContent = merchant;
				merchantsSelect.appendChild(option);
			});
			
			// Set selected value
			merchantsSelect.value = localSelectedMerchant || '';
			
			// Clear flag after DOM update is complete
			isUpdatingUI = false;
		}
	}
	
	// Function to open modal and fetch fresh data
	async function openModal() {
		showModal = true;
		// Fetch fresh data when modal opens
		await loadUnassignedMerchants();
	}

	function handleModalSelect(merchant) {
		// Update local selection to match the modal selection
		localSelectedMerchant = merchant;
		onSelect(merchant);
		// Close the modal
		showModal = false;
	}

	// Function to refresh the merchant list - can be called by parent components
	async function refreshMerchantList() {
		// Add a small delay to ensure database transactions are fully committed
		await new Promise((resolve) => setTimeout(resolve, 100));
		await loadUnassignedMerchants();
	}

	// Note: No longer need removeMerchantFromLocalState or addMerchantToLocalState
	// The modal will fetch fresh data when opened, eliminating state synchronization issues

	// Function to reset the merchant picker state
	function resetMerchantPicker() {
		localSelectedMerchant = '';
		// Also refresh the merchant list to ensure it's up to date
		loadUnassignedMerchants();
		// Reset the select element value as well
		const selectElement = document.getElementById('merchant-picker');
		if (selectElement) {
			selectElement.value = '';
		}
	}





	// Manual sync function to avoid infinite loops
	function syncWithParent() {
		if (!isUpdatingUI && merchantsSelect) {
			merchantsSelect.value = selectedMerchant || '';
		}
		// Update local state without triggering reactivity
		localSelectedMerchant = selectedMerchant;
	}

	// Watch for changes to selectedMerchant prop and update DOM accordingly
	$effect(() => {
		// Only update if we're not currently updating UI and the select exists
		if (!isUpdatingUI && merchantsSelect) {
			merchantsSelect.value = selectedMerchant || '';
		}
		// Update local state
		localSelectedMerchant = selectedMerchant;
	});

	onMount(() => {
		// Load merchants - UI will be updated when DOM elements are available
		loadUnassignedMerchants();
	});

	// Note: No longer exporting state management functions
	// The modal fetches fresh data when opened, eliminating the need for state synchronization
</script>

<div class="w-full">
	<label for="merchant-picker" class="block text-sm font-medium text-gray-300 mb-2">
		Select Merchant
	</label>

	<div class="space-y-3">
		<!-- Loading state -->
		<div bind:this={loadingElement} class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-400" style="display: none;">
			Loading recent merchants...
		</div>
		
		<!-- Error state -->
		<div bind:this={errorElement} class="w-full px-3 py-2 bg-red-900 border border-red-700 rounded-md text-red-200" style="display: none;">
		</div>
		
		<!-- Empty state -->
		<div bind:this={emptyStateElement} class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-400" style="display: none;">
			No recent unassigned merchants found
		</div>
		
		<!-- Merchants select -->
		<select
			bind:this={merchantsSelect}
			id="merchant-picker"
			onchange={handleSelect}
			class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
		>
			<option value="">{placeholder}</option>
			<!-- Options will be added manually via updateMerchantsUI() -->
			</select>

			<div class="flex justify-between items-center">
				<button
					onclick={openModal}
					class="text-blue-400 hover:text-blue-300 text-sm underline"
				>
					View All Merchants
				</button>
				<p class="text-gray-500 text-xs">Showing 20 most recent merchants from the past month</p>
			</div>
		</div>
</div>

<MerchantSelectionModal
	isOpen={showModal}
	onClose={() => {
		showModal = false;
	}}
	onSelect={handleModalSelect}
/>
