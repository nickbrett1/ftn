<script>
	import { onMount } from 'svelte';
	import Button from './Button.svelte';

	// Props with proper Svelte 5 syntax
	let { 
		isOpen = false, 
		onClose = () => {}, 
		onSelect = () => {},
		searchTerm = $bindable('')
	} = $props();

	// Simple state management
	let merchants = $state([]);
	let filteredMerchants = $state([]);
	let isLoading = $state(true);
	let error = $state('');

	// Load merchants when modal opens
	async function loadMerchants() {
		try {
			isLoading = true;
			error = '';
			
			const response = await fetch('/projects/ccbilling/budgets/unassigned-merchants');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			const data = await response.json();
			if (Array.isArray(data)) {
				merchants = data;
				filteredMerchants = data;
			} else {
				throw new Error('Invalid data format');
			}
		} catch (err) {
			console.error('Failed to load merchants:', err);
			error = err.message;
			merchants = [];
			filteredMerchants = [];
		} finally {
			isLoading = false;
		}
	}

	// Simple search function
	function performSearch() {
		if (!searchTerm.trim()) {
			filteredMerchants = merchants;
		} else {
			filteredMerchants = merchants.filter(merchant => 
				merchant.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}
	}

	// Handle merchant selection
	function selectMerchant(merchant) {
		onSelect(merchant);
		onClose();
	}

	// Load merchants when modal opens
	$effect(() => {
		if (isOpen) {
			loadMerchants();
		}
	});

	// Search when searchTerm changes
	$effect(() => {
		performSearch();
	});

	// Prevent body scroll when modal is open
	$effect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	});
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		onclick={onClose}
	>
		<!-- Modal Content -->
		<div 
			class="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex justify-between items-center p-6 border-b border-gray-700">
				<h2 class="text-xl font-bold text-white">Select Merchant</h2>
				<button 
					onclick={onClose}
					class="text-gray-400 hover:text-white text-2xl font-bold"
				>
					&times;
				</button>
			</div>

			<!-- Search Input -->
			<div class="p-6 border-b border-gray-700">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search merchants..."
					class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				
				<!-- Debug info in dev mode -->
				{#if import.meta.env.DEV}
					<div class="mt-2 text-xs text-gray-500">
						searchTerm: "{searchTerm}" (length: {searchTerm.length})
					</div>
				{/if}
			</div>

			<!-- Merchants List -->
			<div class="p-6 max-h-80 overflow-y-auto">
				{#if isLoading}
					<div class="text-center py-8">
						<p class="text-gray-400">Loading merchants...</p>
					</div>
				{:else if error}
					<div class="text-center py-8">
						<p class="text-red-400">Error: {error}</p>
						<button 
							onclick={loadMerchants}
							class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
						>
							Retry
						</button>
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
								onclick={() => selectMerchant(merchant)}
								class="w-full text-left p-3 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:border-gray-600 transition-colors"
							>
								<span class="text-white">{merchant}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex justify-end p-6 border-t border-gray-700">
				<Button onclick={onClose} variant="secondary" size="md">
					Cancel
				</Button>
			</div>
		</div>
	</div>
{/if}
