<script>
	import { onMount } from 'svelte';
	import MerchantSelectionModal from './MerchantSelectionModal.svelte';

	const {
		selectedMerchant = '',
		onSelect = () => {},
		placeholder = 'Select a merchant...'
	} = $props();

	let allUnassignedMerchants = []; // All unassigned merchants from server (no UI reactivity needed)
	let merchants = $state([]); // Currently displayed merchants (UI needs to react to changes)
	let isLoading = $state(true); // UI needs to show loading state
	let error = $state(''); // UI needs to show errors
	let showModal = $state(false); // UI needs to show/hide modal
	let localSelectedMerchant = $state(selectedMerchant); // UI needs to react to selection changes
	let isUpdatingMerchants = false; // Flag to prevent recursive updates

	async function loadUnassignedMerchants() {
		try {
			isLoading = true;
			error = '';

			const response = await fetch('/projects/ccbilling/budgets/recent-merchants');

			// Add safety check for response
			if (!response) {
				throw new Error('No response received from server');
			}

			if (!response.ok) {
				throw new Error('Failed to load recent merchants');
			}

			const data = await response.json();
			allUnassignedMerchants = Array.isArray(data) ? data.sort((a, b) => a.localeCompare(b)) : [];
			
			// Show the first 20 merchants (they're already sorted by recency from the server)
			merchants = allUnassignedMerchants.slice(0, 20);
		} catch (err) {
			console.error('Error loading merchants:', err);
			error = err.message || 'Failed to load merchants';
		} finally {
			isLoading = false;
		}
	}

	function handleSelect(event) {
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

	// Function to remove a merchant from local state and refresh the display
	function removeMerchantFromLocalState(merchantToRemove) {
		if (isUpdatingMerchants) return; // Prevent recursive calls
		
		isUpdatingMerchants = true;
		
		// Remove the merchant from allUnassignedMerchants
		allUnassignedMerchants = allUnassignedMerchants.filter(merchant => merchant !== merchantToRemove);
		
		// Update the displayed merchants (show the next 20) using a new array to trigger reactivity
		merchants = [...allUnassignedMerchants.slice(0, 20)];
		
		// Note: Don't reset localSelectedMerchant here to avoid reactive loops
		// The parent component will handle resetting the selection
		
		isUpdatingMerchants = false;
	}

	// Function to add a merchant back to the available merchants list
	function addMerchantToLocalState(merchantToAdd) {
		console.log('addMerchantToLocalState called with:', merchantToAdd);
		console.log('Current allUnassignedMerchants:', allUnassignedMerchants);
		console.log('Current merchants (combo box):', merchants);
		
		// Add the merchant to allUnassignedMerchants if it's not already there
		if (!allUnassignedMerchants.includes(merchantToAdd)) {
			allUnassignedMerchants = [...allUnassignedMerchants, merchantToAdd].sort((a, b) => 
				a.toLowerCase().localeCompare(b.toLowerCase())
			);
			
			// Only add to combo box if the merchant would be in the first 20
			// This respects the "most recent merchants" logic
			const updatedMerchants = allUnassignedMerchants.slice(0, 20);
			if (updatedMerchants.includes(merchantToAdd)) {
				merchants = updatedMerchants;
				console.log('Merchant added to combo box (within first 20)');
			} else {
				console.log('Merchant not added to combo box (beyond first 20)');
			}
			
			console.log('After adding - allUnassignedMerchants:', allUnassignedMerchants);
			console.log('After adding - merchants (combo box):', merchants);
		} else {
			console.log('Merchant already exists in allUnassignedMerchants');
		}
	}

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





	onMount(() => {
		loadUnassignedMerchants();
	});

	// Export functions for parent component to use
	export { removeMerchantFromLocalState, addMerchantToLocalState };
</script>

<div class="w-full">
	<label for="merchant-picker" class="block text-sm font-medium text-gray-300 mb-2">
		Select Merchant
	</label>

	{#if isLoading}
		<div class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-400">
			Loading recent merchants...
		</div>
	{:else if error}
		<div class="w-full px-3 py-2 bg-red-900 border border-red-700 rounded-md text-red-200">
			Error: {error}
		</div>
	{:else if merchants.length === 0}
		<div class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-400">
			No recent unassigned merchants found
		</div>
	{:else}
		<div class="space-y-3">
			<select
				id="merchant-picker"
				value={localSelectedMerchant}
				onchange={handleSelect}
				class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			>
				<option value="">{placeholder}</option>
				{#each merchants as merchant}
					<option value={merchant}>
						{merchant}
					</option>
				{/each}
				{#if localSelectedMerchant && !merchants.includes(localSelectedMerchant)}
					<option value={localSelectedMerchant}>
						{localSelectedMerchant}
					</option>
				{/if}
			</select>

			<div class="flex justify-between items-center">
				<button
					onclick={() => (showModal = true)}
					class="text-blue-400 hover:text-blue-300 text-sm underline"
				>
					View All Merchants
				</button>
				<p class="text-gray-500 text-xs">Showing 20 most recent merchants from the past month</p>
			</div>
		</div>
	{/if}
</div>

<MerchantSelectionModal
	isOpen={showModal}
	onClose={() => (showModal = false)}
	onSelect={handleModalSelect}
/>
