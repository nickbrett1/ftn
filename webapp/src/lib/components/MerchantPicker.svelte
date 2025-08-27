<script>
	import { onMount } from 'svelte';
	import MerchantSelectionModal from './MerchantSelectionModal.svelte';

	const {
		selectedMerchant = '',
		onSelect = () => {},
		onAddMerchant = null, // New prop for directly adding merchants
		placeholder = 'Select a merchant...'
	} = $props();

	let allUnassignedMerchants = $state([]); // All unassigned merchants from server
	let merchants = $state([]); // Currently displayed merchants (filtered from allUnassignedMerchants)
	let isLoading = $state(true);
	let error = $state('');
	let showModal = $state(false);
	let localSelectedMerchant = $state(''); // Local state for internal management

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
			onSelect(selectedValue);
			// Clear the selection immediately to prevent double-selection
			localSelectedMerchant = '';
			// Reset the select element value
			event.target.value = '';
			// Add a small delay to ensure any database changes are committed
			setTimeout(() => {
				// Refresh the merchant list to ensure it's up to date
				// This helps when the merchant might be added to auto-assignment
				loadUnassignedMerchants();
			}, 100);
		}
	}

	function handleModalSelect(merchant) {
		// If onAddMerchant is provided, directly add the merchant
		if (onAddMerchant && typeof onAddMerchant === 'function') {
			onAddMerchant(merchant);
		} else {
			// Fallback to the old behavior
			onSelect(merchant);
		}
		
		// Clear any existing selection
		localSelectedMerchant = '';
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
		// Remove the merchant from allUnassignedMerchants
		allUnassignedMerchants = allUnassignedMerchants.filter(merchant => merchant !== merchantToRemove);
		
		// Update the displayed merchants (show the next 20)
		merchants = allUnassignedMerchants.slice(0, 20);
	}

	// Function to add a merchant back to the available merchants list
	function addMerchantToLocalState(merchantToAdd) {
		// Add the merchant to allUnassignedMerchants if it's not already there
		if (!allUnassignedMerchants.includes(merchantToAdd)) {
			allUnassignedMerchants = [...allUnassignedMerchants, merchantToAdd].sort((a, b) => 
				a.toLowerCase().localeCompare(b.toLowerCase())
			);
			
			// Update the displayed merchants (show the next 20)
			merchants = allUnassignedMerchants.slice(0, 20);
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



	// Sync local state with prop when it changes
	$effect(() => {
		localSelectedMerchant = selectedMerchant;
		// If the parent component clears the selection, also reset the select element
		if (!selectedMerchant) {
			const selectElement = document.getElementById('merchant-picker');
			if (selectElement) {
				selectElement.value = '';
			}
		}
	});

	onMount(() => {
		loadUnassignedMerchants();
	});
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
