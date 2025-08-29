<script>
	import { onMount } from 'svelte';
	import MerchantSelectionModal from './MerchantSelectionModal.svelte';

	const {
		selectedMerchant = '',
		onSelect = () => {},
		placeholder = 'Select a merchant...',
		assignedMerchants = new Set() // New prop: set of currently assigned merchant names
	} = $props();

	// Reactive state
	let allUnassignedMerchants = $state([]);

	let isLoading = $state(true);
	let error = $state('');
	let showModal = $state(false);
	let localSelectedMerchant = $state('');
	
	// Derived state - filter out currently assigned merchants
	let availableMerchants = $derived(
		allUnassignedMerchants.filter(merchant => 
			!assignedMerchants.has(merchant.toLowerCase())
		)
	);
	let displayMerchants = $derived(availableMerchants.slice(0, 20));
	let hasMerchants = $derived(availableMerchants.length > 0);
	let showEmptyState = $derived(!isLoading && !error && !hasMerchants);

	async function loadUnassignedMerchants() {
		try {
			isLoading = true;
			error = '';

			const response = await fetch('/projects/ccbilling/budgets/recent-merchants');
			
			if (!response.ok) {
				throw new Error(`Failed to load recent merchants: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			
			allUnassignedMerchants = Array.isArray(data) ? data.sort((a, b) => a.localeCompare(b)) : [];
			// No need to set merchants - it's now derived from allUnassignedMerchants and assignedMerchants
		} catch (err) {
			error = err.message || 'Failed to load merchants';
		} finally {
			isLoading = false;
		}
	}

	function handleSelect(event) {
		const selectedValue = event.target.value;
		localSelectedMerchant = selectedValue;
		
		if (selectedValue) {
			onSelect(selectedValue);
		}
	}
	
	async function openModal() {
		showModal = true;
		await loadUnassignedMerchants();
	}

	function handleModalSelect(merchant) {
		localSelectedMerchant = merchant;
		onSelect(merchant);
		showModal = false;
	}

	// Sync local state with parent prop
	$effect(() => {
		localSelectedMerchant = selectedMerchant || '';
	});

	// Expose refresh function to parent
	async function refreshMerchantList() {
		await loadUnassignedMerchants();
	}

	// Export the function for parent components
	export { refreshMerchantList };

	onMount(() => {
		loadUnassignedMerchants();
	});
</script>

<div class="w-full">
	<label for="merchant-picker" class="block text-sm font-medium text-gray-300 mb-2">
		Select Merchant
	</label>

	<div class="space-y-3">
		<!-- Loading state -->
		{#if isLoading}
			<div class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-400">
				Loading recent merchants...
			</div>
		{/if}
		
		<!-- Error state -->
		{#if error}
			<div class="w-full px-3 py-2 bg-red-900 border border-red-700 rounded-md text-red-200">
				Error: {error}
			</div>
		{/if}
		
		<!-- Empty state -->
		{#if showEmptyState}
			<div class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-400">
				No recent unassigned merchants found
			</div>
		{/if}
		
		<!-- Merchants select -->
		{#if !isLoading && !error}
			<select
				id="merchant-picker"
				bind:value={localSelectedMerchant}
				onchange={handleSelect}
				class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			>
				<option value="">{placeholder}</option>
				{#each displayMerchants as merchant}
					<option value={merchant}>{merchant}</option>
				{/each}
			</select>
		{/if}

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
	onClose={() => (showModal = false)}
	onSelect={handleModalSelect}
/>
