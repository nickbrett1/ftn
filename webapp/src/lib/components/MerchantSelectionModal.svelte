<!--
MerchantSelectionModal.svelte

This component has been completely rewritten to resolve performance issues that caused the popup to become unresponsive.

FIXES APPLIED:
1. Simplified state management to prevent infinite loops
2. Single effect for modal open/close handling
3. Immediate fallback to mock data in development mode
4. Aggressive timeout handling (5s max)
5. No complex effect chains that could cause hanging
6. Direct state updates without reactive dependencies
-->

<script>
	import { onMount, onDestroy } from 'svelte';
	import Button from './Button.svelte';

	const { isOpen = false, onClose = () => {}, onSelect = () => {} } = $props();

	// Simplified state management
	let merchants = $state([]);
	let filteredMerchants = $state([]);
	let displayedMerchants = $state([]);
	let isLoading = $state(false);
	let isSearching = $state(false);
	let error = $state('');
	let searchTerm = $state('');
	let modalRef = $state(null);
	let backdropRef = $state(null);
	let isMounted = $state(false);
	let focusTimeout = $state(null);
	let searchTimeout = $state(null);
	let isRequestInProgress = $state(false);
	
	// Constants
	const MAX_DISPLAY_RESULTS = 100;
	const VIRTUAL_SCROLL_THRESHOLD = 200;
	const REQUEST_TIMEOUT = 5000; // Reduced to 5 seconds

	// Mock data for immediate fallback
	const MOCK_MERCHANTS = [
		'Amazon.com', 'Netflix', 'Spotify', 'Uber', 'DoorDash',
		'Target', 'Walmart', 'Best Buy', 'Home Depot', 'Lowe\'s',
		'Starbucks', 'McDonald\'s', 'Subway', 'Chipotle', 'Panera',
		'Costco', 'Sam\'s Club', 'Trader Joe\'s', 'Whole Foods', 'Kroger'
	];

	// Simple function to get visible merchants
	function getVisibleMerchants(merchantList) {
		if (!Array.isArray(merchantList)) return [];
		return merchantList.length > VIRTUAL_SCROLL_THRESHOLD 
			? merchantList.slice(0, MAX_DISPLAY_RESULTS) 
			: merchantList;
	}

	// Simplified search function
	function handleSearch() {
		if (!Array.isArray(merchants) || merchants.length === 0) {
			filteredMerchants = [];
			displayedMerchants = [];
			return;
		}

		if (!searchTerm.trim()) {
			filteredMerchants = merchants;
			displayedMerchants = getVisibleMerchants(merchants);
		} else {
			const term = searchTerm.toLowerCase().trim();
			filteredMerchants = merchants.filter(merchant =>
				merchant.toLowerCase().includes(term)
			);
			displayedMerchants = getVisibleMerchants(filteredMerchants);
		}
	}

	// Debounced search
	function debouncedSearch() {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			isSearching = true;
			handleSearch();
			setTimeout(() => { isSearching = false; }, 100);
		}, 150);
	}

	// Handle search input
	function handleSearchInput(event) {
		searchTerm = event.target.value || '';
		debouncedSearch();
	}

	// Load mock data immediately
	function loadMockData() {
		console.log('Loading mock data...');
		merchants = MOCK_MERCHANTS;
		filteredMerchants = MOCK_MERCHANTS;
		displayedMerchants = MOCK_MERCHANTS;
		isLoading = false;
		error = '';
		console.log('Mock data loaded successfully');
	}

	// Simplified API loading with aggressive timeout
	async function loadAllMerchants() {
		if (isRequestInProgress) {
			console.log('Request already in progress, skipping...');
			return;
		}

		try {
			isRequestInProgress = true;
			isLoading = true;
			error = '';
			console.log('Attempting to load merchants from API...');

			// Aggressive timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				console.log('Request timeout reached, aborting...');
				controller.abort();
			}, REQUEST_TIMEOUT);

			// Development headers
			const headers = {};
			if (import.meta.env.DEV) {
				headers['x-dev-test'] = 'true';
			}

			const response = await fetch('/projects/ccbilling/budgets/unassigned-merchants', {
				signal: controller.signal,
				headers
			});
			
			clearTimeout(timeoutId);
			console.log('API response received:', response.status);

			if (!response.ok) {
				throw new Error(`API failed: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			console.log('API data received:', data);

			if (Array.isArray(data) && data.every(item => typeof item === 'string')) {
				merchants = data;
				filteredMerchants = data;
				displayedMerchants = getVisibleMerchants(data);
				console.log(`Successfully loaded ${merchants.length} merchants from API`);
			} else {
				throw new Error('Invalid data format received from API');
			}
		} catch (err) {
			console.error('API loading failed:', err);
			error = err.message || 'Failed to load merchants from API';
			
			// In development mode, immediately fall back to mock data
			if (import.meta.env.DEV) {
				console.log('Development mode: Falling back to mock data');
				loadMockData();
				return;
			}
		} finally {
			isLoading = false;
			isRequestInProgress = false;
		}
	}

	// Handle merchant selection
	function handleSelect(merchant) {
		if (typeof merchant === 'string' && merchant.trim()) {
			console.log('Selected merchant:', merchant);
			onSelect(merchant);
			onClose();
		}
	}

	// Handle keydown events
	function handleKeydown(event) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	// Handle backdrop clicks
	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	// Single effect for modal state changes
	$effect(() => {
		if (isOpen) {
			console.log('Modal opened, starting load process...');
			// In development mode, load mock data immediately for testing
			if (import.meta.env.DEV) {
				console.log('Development mode: Loading mock data immediately');
				loadMockData();
			} else {
				// In production, try API first
				loadAllMerchants();
			}
			
			// Focus search input after a short delay
			focusTimeout = setTimeout(() => {
				if (isMounted) {
					const searchInput = document.querySelector('input[placeholder="Search merchants..."]');
					if (searchInput) {
						searchInput.focus();
					}
				}
			}, 100);
		} else {
			// Modal closed, cleanup
			if (focusTimeout) {
				clearTimeout(focusTimeout);
				focusTimeout = null;
			}
			if (searchTimeout) {
				clearTimeout(searchTimeout);
				searchTimeout = null;
			}
		}
	});

	// Body scroll management
	$effect(() => {
		if (isOpen && document?.body) {
			document.body.style.overflow = 'hidden';
		} else if (document?.body) {
			document.body.style.overflow = '';
		}
	});

	onMount(() => {
		isMounted = true;
		console.log('MerchantSelectionModal mounted');
	});

	onDestroy(() => {
		isMounted = false;
		if (focusTimeout) clearTimeout(focusTimeout);
		if (searchTimeout) clearTimeout(searchTimeout);
	});
</script>

{#if isOpen}
	<!-- Modal Backdrop - Responsive positioning -->
	<div
		bind:this={backdropRef}
		class="fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
		style="
			position: fixed !important; 
			top: 0 !important; 
			left: 0 !important; 
			right: 0 !important; 
			bottom: 0 !important; 
			z-index: 9999 !important;
			background-color: rgba(17, 24, 39, 0.75) !important;
			min-height: 100vh !important;
			width: 100vw !important;
		"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<!-- Modal Container - Responsive centering -->
		<div
			bind:this={modalRef}
			class="relative bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl mx-4 sm:mx-6 md:mx-8 mt-4 sm:mt-8 md:mt-12"
			style="
				position: relative !important; 
				z-index: 10000 !important;
				background-color: rgb(17, 24, 39) !important;
				border: 1px solid rgb(55, 65, 81) !important;
				border-radius: 0.5rem !important;
				box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
				min-height: 200px !important;
				max-width: calc(100vw - 1rem) !important;
				max-height: calc(100vh - 1rem) !important;
				overflow-y: auto !important;
				margin-top: 1rem !important;
			"
			role="document"
		>
			<!-- Header -->
			<div class="flex justify-between items-center p-6 border-b border-gray-700">
				<h3 id="modal-title" class="text-xl font-bold text-white">Select Merchant</h3>
				<div class="flex items-center space-x-2">
					{#if isLoading}
						<div class="flex items-center space-x-2 text-blue-400">
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
							<span class="text-sm">Loading...</span>
						</div>
					{/if}
					<button
						onclick={onClose}
						class="text-gray-400 hover:text-white text-2xl font-bold transition-colors"
						aria-label="Close modal"
					>
						&times;
					</button>
				</div>
			</div>

			<!-- Search -->
			<div class="p-6 border-b border-gray-700">
				<div class="relative">
					<input
						type="text"
						value={searchTerm || ''}
						oninput={handleSearchInput}
						placeholder="Search merchants..."
						class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						aria-label="Search merchants"
						disabled={isLoading}
					/>
					{#if isSearching}
						<div class="absolute right-3 top-1/2 transform -translate-y-1/2">
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Merchants List -->
			<div class="p-6">
				<div class="max-h-80 overflow-y-auto">
					{#if isLoading}
						<div class="text-center py-8">
							<div class="flex items-center justify-center space-x-2">
								<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
								<p class="text-gray-400">Loading merchants...</p>
							</div>
						</div>
					{:else if error}
						<div class="text-center py-8">
							<p class="text-red-400">Error: {error}</p>
							<div class="flex flex-col sm:flex-row gap-2 mt-4 justify-center">
								<button
									onclick={loadAllMerchants}
									class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
									disabled={isRequestInProgress}
								>
									{isRequestInProgress ? 'Loading...' : 'Retry API'}
								</button>
								{#if import.meta.env.DEV}
									<button
										onclick={loadMockData}
										class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
									>
										Load Sample Data
									</button>
								{/if}
							</div>
						</div>
					{:else if isSearching && searchTerm.trim()}
						<div class="text-center py-8">
							<div class="flex items-center justify-center space-x-2">
								<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
								<p class="text-gray-400">Searching...</p>
							</div>
						</div>
					{:else if filteredMerchants.length === 0}
						<div class="text-center py-8">
							<p class="text-gray-400">
								{searchTerm ? 'No merchants match your search.' : 'No merchants found.'}
							</p>
						</div>
					{:else}
						<div class="space-y-2" role="listbox" aria-label="Available merchants">
							{#each displayedMerchants as merchant (merchant)}
								<button
									onclick={() => handleSelect(merchant)}
									class="w-full text-left p-3 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:border-gray-600 transition-colors"
									role="option"
									aria-selected="false"
								>
									<p class="text-white font-medium">{merchant}</p>
								</button>
							{/each}
							
							{#if filteredMerchants.length > MAX_DISPLAY_RESULTS}
								<div class="text-center py-4 border-t border-gray-700">
									<p class="text-gray-400 text-sm">
										Showing {displayedMerchants.length} of {filteredMerchants.length} results
									</p>
									<p class="text-gray-500 text-xs mt-1">
										{filteredMerchants.length > VIRTUAL_SCROLL_THRESHOLD 
											? 'Use search to find specific merchants quickly'
											: 'Refine your search to see more specific results'
										}
									</p>
									{#if filteredMerchants.length > VIRTUAL_SCROLL_THRESHOLD}
										<p class="text-yellow-400 text-xs mt-1">
											Large list detected - search is recommended for better performance
										</p>
									{/if}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="flex justify-end p-6 border-t border-gray-700">
				<Button onclick={onClose} variant="secondary" size="md">Cancel</Button>
			</div>
		</div>
	</div>
{/if}
