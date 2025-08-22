<script>
	import { onMount, onDestroy } from 'svelte';
	import Button from './Button.svelte';

	const { isOpen = false, onClose = () => {}, onSelect = () => {} } = $props();

	let merchants = $state([]);
	let filteredMerchants = $state([]);
	let displayedMerchants = $state([]); // Add displayed merchants for pagination
	let isLoading = $state(true);
	let isSearching = $state(false); // Add search loading state
	let error = $state('');
	let searchTerm = $state('');
	let modalRef = $state(null);
	let backdropRef = $state(null);
	let isMounted = $state(false);
	let focusTimeout = $state(null);
	let searchTimeout = $state(null); // Add debouncing timeout
	let isRequestInProgress = $state(false); // Prevent multiple simultaneous requests
	const MAX_DISPLAY_RESULTS = 100; // Limit displayed results for performance
	const VIRTUAL_SCROLL_THRESHOLD = 200; // Use virtual scrolling for lists larger than this

	async function loadAllMerchants() {
		// Prevent multiple simultaneous requests
		if (isRequestInProgress) {
			console.log('Request already in progress, skipping...');
			return;
		}

		try {
			isRequestInProgress = true;
			isLoading = true;
			error = '';
			console.log('Loading merchants...'); // Debug log

			// Add timeout to prevent hanging requests
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

			const response = await fetch('/projects/ccbilling/budgets/unassigned-merchants', {
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			
			if (!response.ok) {
				throw new Error(`Failed to load merchants: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			
			// Validate that we received an array of strings
			if (Array.isArray(data) && data.every(item => typeof item === 'string')) {
				merchants = data;
				filteredMerchants = data;
				displayedMerchants = getVisibleMerchants();
				console.log(`Loaded ${merchants.length} merchants`); // Debug log
			} else {
				console.warn('Received invalid merchants data format:', data);
				merchants = [];
				filteredMerchants = [];
				displayedMerchants = [];
				error = 'Invalid data format received from server';
			}
		} catch (err) {
			console.error('Error loading merchants:', err); // Debug log
			if (err.name === 'AbortError') {
				error = 'Request timed out. Please try again.';
			} else {
				error = err.message || 'Failed to load merchants';
			}
			merchants = [];
			filteredMerchants = [];
			displayedMerchants = [];
		} finally {
			isLoading = false;
			isRequestInProgress = false;
		}
	}

	// Virtual scrolling function for large lists
	function getVisibleMerchants() {
		if (filteredMerchants.length <= VIRTUAL_SCROLL_THRESHOLD) {
			return filteredMerchants;
		}
		
		// For very large lists, only show first 100 results
		// This prevents the UI from becoming unresponsive
		return filteredMerchants.slice(0, MAX_DISPLAY_RESULTS);
	}

	function handleSearch() {
		try {
			// Clear any existing timeout
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}

			// Ensure merchants is a valid array
			if (!Array.isArray(merchants) || merchants.length === 0) {
				filteredMerchants = [];
				displayedMerchants = [];
				return;
			}

			if (!searchTerm.trim()) {
				filteredMerchants = merchants;
				// Use virtual scrolling for large lists
				displayedMerchants = getVisibleMerchants();
			} else {
				// Ensure merchants is an array and contains only strings before filtering
				if (merchants.every(m => typeof m === 'string')) {
					const term = searchTerm.toLowerCase().trim();
					filteredMerchants = merchants.filter((merchant) =>
						merchant.toLowerCase().includes(term)
					);
					// Use virtual scrolling for large lists
					displayedMerchants = getVisibleMerchants();
				} else {
					console.warn('Merchants data is not in expected format:', merchants);
					filteredMerchants = [];
					displayedMerchants = [];
				}
			}
			console.log(`Filtered to ${filteredMerchants.length} merchants, displaying ${displayedMerchants.length}`); // Debug log
		} catch (err) {
			console.error('Error in handleSearch:', err);
			// Fallback to showing all merchants if filtering fails
			filteredMerchants = Array.isArray(merchants) ? merchants : [];
			displayedMerchants = getVisibleMerchants();
		}
	}

	// Add error boundary for search operations
	function safeSearch() {
		try {
			handleSearch();
		} catch (err) {
			console.error('Search error:', err);
			// Fallback to showing all merchants if search fails
			filteredMerchants = Array.isArray(merchants) ? merchants : [];
			displayedMerchants = getVisibleMerchants();
			error = 'Search operation failed. Showing all merchants.';
		}
	}

	// Debounced search function
	function debouncedSearch() {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
		searchTimeout = setTimeout(() => {
			isSearching = true;
			safeSearch();
			// Small delay to show search state for better UX
			setTimeout(() => {
				isSearching = false;
			}, 100);
		}, 150); // 150ms debounce delay
	}

	function handleSelect(merchant) {
		try {
			if (typeof merchant === 'string' && merchant.trim()) {
				console.log('Selected merchant:', merchant); // Debug log
				onSelect(merchant);
				onClose();
			} else {
				console.warn('Invalid merchant selected:', merchant);
			}
		} catch (err) {
			console.error('Error in handleSelect:', err);
		}
	}

	function handleKeydown(event) {
		try {
			if (event && event.key === 'Escape') {
				console.log('Escape key pressed, closing modal'); // Debug log
				onClose();
			}
		} catch (err) {
			console.error('Error in handleKeydown:', err);
		}
	}

	function handleBackdropClick(event) {
		try {
			if (event && event.target === event.currentTarget) {
				console.log('Backdrop clicked, closing modal'); // Debug log
				onClose();
			}
		} catch (err) {
			console.error('Error in handleBackdropClick:', err);
		}
	}

	// Handle search input changes with debouncing
	function handleSearchInput(event) {
		searchTerm = event.target.value || '';
		debouncedSearch();
	}

	// Only run handleSearch when searchTerm changes - but with debouncing
	$effect(() => {
		if (Array.isArray(merchants) && merchants.length > 0 && !searchTerm.trim()) {
			// Only auto-filter when there's no search term
			filteredMerchants = merchants;
		}
	});

	// Effect for when merchants data is loaded
	$effect(() => {
		if (Array.isArray(merchants) && merchants.length > 0) {
			// Initialize filtered merchants when data is first loaded
			filteredMerchants = merchants;
			displayedMerchants = getVisibleMerchants();
		}
	});

	onMount(() => {
		try {
			console.log('MerchantSelectionModal mounted'); // Debug log
			isMounted = true;
			if (isOpen) {
				loadAllMerchants();
			}
		} catch (err) {
			console.error('Error in onMount:', err);
		}
	});

	onDestroy(() => {
		try {
			isMounted = false;
			if (focusTimeout) {
				clearTimeout(focusTimeout);
			}
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
		} catch (err) {
			console.error('Error in onDestroy:', err);
		}
	});

	$effect(() => {
		console.log('Modal isOpen changed:', isOpen); // Debug log
		if (isOpen && !isRequestInProgress) {
			loadAllMerchants();
			// Focus the search input when modal opens
			focusTimeout = setTimeout(() => {
				try {
					if (isMounted) {
						const searchInput = document.querySelector('input[placeholder="Search merchants..."]');
						if (searchInput) {
							searchInput.focus();
							console.log('Search input focused'); // Debug log
						} else {
							console.log('Search input not found'); // Debug log
						}
					}
				} catch (err) {
					console.error('Error focusing search input:', err);
				}
			}, 100);
			
			// Scroll to top of modal when it opens
			setTimeout(() => {
				try {
					if (modalRef) {
						modalRef.scrollTop = 0;
					}
				} catch (err) {
					console.error('Error scrolling modal:', err);
				}
			}, 50);
		} else {
			// Clear timeouts when modal closes
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

	// Prevent body scroll when modal is open
	$effect(() => {
		try {
			if (isOpen) {
				console.log('Preventing body scroll'); // Debug log
				if (document && document.body) {
					document.body.style.overflow = 'hidden';
				}
			} else {
				console.log('Restoring body scroll'); // Debug log
				if (document && document.body) {
					document.body.style.overflow = '';
				}
			}
		} catch (err) {
			console.error('Error managing body scroll:', err);
		}

		return () => {
			try {
				console.log('Cleanup: restoring body scroll'); // Debug log
				if (document && document.body) {
					document.body.style.overflow = '';
				}
			} catch (err) {
				console.error('Error in cleanup:', err);
			}
		};
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
				<button
					onclick={onClose}
					class="text-gray-400 hover:text-white text-2xl font-bold transition-colors"
					aria-label="Close modal"
				>
					&times;
				</button>
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
							<button
								onclick={loadAllMerchants}
								class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
								disabled={isRequestInProgress}
							>
								{isRequestInProgress ? 'Loading...' : 'Retry'}
							</button>
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
								{searchTerm ? 'No merchants match your search.' : 'No unassigned merchants found.'}
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
