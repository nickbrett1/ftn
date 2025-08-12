<script>
	import { onMount } from 'svelte';
	import Button from './Button.svelte';

	const { isOpen = false, onClose = () => {}, onSelect = () => {} } = $props();

	let merchants = $state([]);
	let filteredMerchants = $state([]);
	let isLoading = $state(true);
	let error = $state('');
	let searchTerm = $state('');

	async function loadAllMerchants() {
		try {
			isLoading = true;
			error = '';

			const response = await fetch('/projects/ccbilling/budgets/unassigned-merchants');
			if (!response.ok) {
				throw new Error('Failed to load merchants');
			}

			merchants = await response.json();
			filteredMerchants = merchants;
		} catch (err) {
			error = err.message;
		} finally {
			isLoading = false;
		}
	}

	function handleSearch() {
		if (!searchTerm.trim()) {
			filteredMerchants = merchants;
		} else {
			filteredMerchants = merchants.filter((merchant) =>
				merchant.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}
	}

	function handleSelect(merchant) {
		onSelect(merchant);
		onClose();
	}

	$effect(() => {
		handleSearch();
	});

	onMount(() => {
		if (isOpen) {
			loadAllMerchants();
		}
	});

	$effect(() => {
		if (isOpen) {
			loadAllMerchants();
		}
	});
</script>

{#if isOpen}
	<div class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
		<div class="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg">
			<div class="flex justify-between items-center mb-6">
				<h3 class="text-xl font-bold text-white">Select Merchant</h3>
				<button onclick={onClose} class="text-gray-400 hover:text-white text-2xl font-bold">
					&times;
				</button>
			</div>

			<!-- Search -->
			<div class="mb-6">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search merchants..."
					class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			<!-- Merchants List -->
			<div class="max-h-96 overflow-y-auto">
				{#if isLoading}
					<div class="text-center py-8">
						<p class="text-gray-400">Loading merchants...</p>
					</div>
				{:else if error}
					<div class="text-center py-8">
						<p class="text-red-400">Error: {error}</p>
					</div>
				{:else if filteredMerchants.length === 0}
					<div class="text-center py-8">
						<p class="text-gray-400">
							{searchTerm ? 'No merchants match your search.' : 'No unassigned merchants found.'}
						</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each filteredMerchants as merchant}
							<button
								onclick={() => handleSelect(merchant)}
								class="w-full text-left p-3 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:border-gray-600 transition-colors"
							>
								<p class="text-white font-medium">{merchant}</p>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex justify-end mt-6">
				<Button onclick={onClose} variant="secondary" size="md">Cancel</Button>
			</div>
		</div>
	</div>
{/if}
