<script>
	import { onMount } from 'svelte';
	import MerchantSelectionModal from './MerchantSelectionModal.svelte';

	const {
		selectedMerchant = '',
		onSelect = () => {},
		placeholder = 'Select a merchant...',
		assignedMerchants = []
	} = $props();

	let merchants = $state([]);
	let isLoading = $state(true);
	let error = $state('');
	let showModal = $state(false);

	async function loadRecentMerchants() {
		try {
			isLoading = true;
			error = '';

			const response = await fetch('/projects/ccbilling/budgets/recent-merchants');
			if (!response.ok) {
				throw new Error('Failed to load recent merchants');
			}

			merchants = await response.json();
		} catch (err) {
			error = err.message;
		} finally {
			isLoading = false;
		}
	}

	function handleSelect(event) {
		const selectedValue = event.target.value;
		if (selectedValue) {
			onSelect(selectedValue);
			// Clear the selection immediately to prevent double-selection
			event.target.value = '';
			// Add a small delay to ensure any database changes are committed
			setTimeout(() => {
				// Refresh the merchant list to ensure it's up to date
				// This helps when the merchant might be added to auto-assignment
				loadRecentMerchants();
			}, 100);
		}
	}

	function handleModalSelect(merchant) {
		onSelect(merchant);
		// Clear any existing selection
		selectedMerchant = '';
		// Add a small delay to ensure any database changes are committed
		setTimeout(() => {
			// Refresh the recent merchants list to remove the newly added merchant
			// This ensures the combo box doesn't show merchants that are no longer unassigned
			loadRecentMerchants();
		}, 100);
	}

	// Function to refresh the merchant list - can be called by parent components
	async function refreshMerchantList() {
		// Add a small delay to ensure database transactions are fully committed
		await new Promise(resolve => setTimeout(resolve, 100));
		await loadRecentMerchants();
	}

	// Function to reset the merchant picker state
	function resetMerchantPicker() {
		selectedMerchant = '';
		// Also refresh the merchant list to ensure it's up to date
		loadRecentMerchants();
	}

	// Refresh merchant list when assigned merchants change
	$effect(() => {
		if (assignedMerchants.length >= 0) {
			loadRecentMerchants();
		}
	});

	onMount(() => {
		loadRecentMerchants();
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
	{:else if merchants.filter(merchant => !assignedMerchants.includes(merchant)).length === 0}
		<div class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-400">
			All recent merchants are already assigned to budgets
		</div>
	{:else}
		<div class="space-y-3">
			<select
				id="merchant-picker"
				value={selectedMerchant}
				onchange={handleSelect}
				class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			>
				<option value="">{placeholder}</option>
				{#each merchants.filter(merchant => !assignedMerchants.includes(merchant)) as merchant}
					<option value={merchant}>
						{merchant}
					</option>
				{/each}
				{#if selectedMerchant && !merchants.includes(selectedMerchant) && !assignedMerchants.includes(selectedMerchant)}
					<option value={selectedMerchant}>
						{selectedMerchant}
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
