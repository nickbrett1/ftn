<script>
	import { onMount, onDestroy } from 'svelte';
	import Button from './Button.svelte';

	const { isOpen = false, onClose = () => {}, onSelect = () => {} } = $props();

	let merchants = $state([]);
	let filteredMerchants = $state([]);
	let isLoading = $state(true);
	let error = $state('');
	let searchTerm = $state('');
	let inputValue = $state(''); // Local input state for display
	let modalRef = $state(null);
	let backdropRef = $state(null);
	let isMounted = $state(false);
	let focusTimeout = $state(null);

	async function loadAllMerchants() {
		try {
			isLoading = true;
			error = '';
			console.log('Loading merchants...'); // Debug log

			const response = await fetch('/projects/ccbilling/budgets/unassigned-merchants');
			if (!response.ok) {
				throw new Error(`Failed to load merchants: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			
			// Validate that we received an array of strings
			if (Array.isArray(data) && data.every(item => typeof item === 'string')) {
				merchants = data;
				// Initialize filtered merchants based on current search term
				if (searchTerm.trim()) {
					handleSearch();
				} else {
					filteredMerchants = data;
				}
			} else {
				console.warn('Received invalid merchants data format:', data);
				merchants = [];
				filteredMerchants = [];
				error = 'Invalid data format received from server';
			}
		} catch (err) {
			console.error('Error loading merchants:', err); // Debug log
			error = err.message;
			merchants = [];
			filteredMerchants = [];
		} finally {
			isLoading = false;
		}
	}

	function handleSearch() {
		try {
			// Ensure merchants is a valid array
			if (!Array.isArray(merchants) || merchants.length === 0) {
				filteredMerchants = [];
				return;
			}

			if (!searchTerm.trim()) {
				filteredMerchants = merchants;
			} else {
				// Ensure merchants is an array and contains only strings before filtering
				if (merchants.every(m => typeof m === 'string')) {
					const filtered = merchants.filter((merchant) =>
						merchant.toLowerCase().includes(searchTerm.toLowerCase())
					);
					filteredMerchants = filtered;
				} else {
					console.warn('Merchants data is not in expected format:', merchants);
					filteredMerchants = [];
				}
			}
		} catch (err) {
			console.error('Error in handleSearch:', err);
			// Fallback to showing all merchants if filtering fails
			filteredMerchants = Array.isArray(merchants) ? merchants : [];
		}
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

	// Effect that only runs when isOpen changes, and only handles modal open/close state
	$effect(() => {
		if (isOpen && isMounted) {
			// Modal is opening - reset state and load merchants
			searchTerm = '';
			inputValue = '';
			loadAllMerchants();
			
			// Focus the search input when modal opens
			focusTimeout = setTimeout(() => {
				try {
					if (isMounted) {
						const searchInput = document.querySelector('input[placeholder="Search merchants..."]');
						if (searchInput) {
							searchInput.focus();
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

			// Prevent body scroll
			if (document && document.body) {
				document.body.style.overflow = 'hidden';
			}
		} else if (isMounted) {
			// Modal is closing - cleanup
			if (focusTimeout) {
				clearTimeout(focusTimeout);
				focusTimeout = null;
			}
			
			// Restore body scroll
			if (document && document.body) {
				document.body.style.overflow = '';
			}
		}
	});

	onMount(() => {
		try {
			isMounted = true;
			// handleModalStateChange(); // This is now handled by the effect
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
			// Restore body scroll
			if (document && document.body) {
				document.body.style.overflow = '';
			}
		} catch (err) {
			console.error('Error in onDestroy:', err);
		}
	});

	// Remove the problematic effect that was causing infinite loops
	// Instead, handle merchants initialization in the loadAllMerchants function


</script>

{#if isOpen}
	<!-- Modal Backdrop - Responsive positioning -->
	<div
		bind:this={backdropRef}
		class="modal-backdrop fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
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
			class="modal-container relative bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl mx-4 sm:mx-6 md:mx-8 mt-4 sm:mt-8 md:mt-12"
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
				<input
					type="text"
					value={inputValue}
					oninput={(e) => {
						const newValue = e.target.value || '';
						
						// Update the input display immediately
						inputValue = newValue;
						
						// Update search term and trigger search
						searchTerm = newValue;
						if (isMounted && !isLoading) {
							handleSearch();
						}
					}}
					placeholder="Search merchants..."
					class="merchant-search-input w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					aria-label="Search merchants"
				/>
				<!-- Debug info -->
				<div class="mt-2 text-xs text-gray-500">
					Debug: Merchants: {merchants.length} | Filtered: {filteredMerchants.length} | Search: "{searchTerm}" | Input: "{inputValue}"
				</div>
			</div>

			<!-- Merchants List -->
			<div class="p-6">
				<div class="max-h-80 overflow-y-auto">
					{#if isLoading}
						<div class="text-center py-8">
							<p class="text-gray-400">Loading merchants...</p>
						</div>
					{:else if error}
						<div class="text-center py-8">
							<p class="text-red-400">Error: {error}</p>
							<button
								onclick={loadAllMerchants}
								class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
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
						<div class="space-y-2" role="listbox" aria-label="Available merchants">
							{#each filteredMerchants as merchant (merchant)}
								<button
									onclick={() => handleSelect(merchant)}
									class="w-full text-left p-3 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:border-gray-600 transition-colors"
									role="option"
									aria-selected="false"
								>
									<p class="text-white font-medium">{merchant}</p>
								</button>
							{/each}
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

<style>
	/* Modal backdrop and container styles */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 9999;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		background-color: rgba(17, 24, 39, 0.75);
		padding: 1rem;
		overflow-y: auto;
	}

	/* Modal content container */
	.modal-container {
		position: relative;
		z-index: 10000;
		background-color: rgb(17, 24, 39);
		border: 1px solid rgb(55, 65, 81);
		border-radius: 0.5rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		width: 100%;
		max-width: 42rem;
		margin: 1rem auto;
	}

	/* Merchant search input specific styling */
	.merchant-search-input {
		color: white;
		background-color: rgb(31, 41, 55);
		border: 1px solid rgb(75, 85, 99);
		-webkit-appearance: none;
		appearance: none;
		font-size: 16px;
		-webkit-text-size-adjust: 100%;
		text-size-adjust: 100%;
		/* Ensure text is always visible */
		-webkit-text-fill-color: white;
		text-fill-color: white;
		/* Force proper rendering */
		transform: translateZ(0);
		-webkit-transform: translateZ(0);
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}

	/* Ensure text is visible on all browsers */
	.merchant-search-input,
	.merchant-search-input:focus,
	.merchant-search-input:active {
		-webkit-text-fill-color: white;
		text-fill-color: white;
		color: white;
	}

	/* Focus state styling */
	.merchant-search-input:focus {
		background-color: rgb(31, 41, 55);
		border-color: rgb(59, 130, 246);
		outline: none;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
	}

	/* Placeholder styling */
	.merchant-search-input::placeholder {
		color: rgb(156, 163, 175);
		opacity: 1;
	}

	.merchant-search-input::-webkit-input-placeholder {
		color: rgb(156, 163, 175);
		opacity: 1;
	}

	.merchant-search-input::-moz-placeholder {
		color: rgb(156, 163, 175);
		opacity: 1;
	}

	/* Mobile-specific improvements */
	@media (max-width: 768px) {
		.modal-backdrop {
			align-items: flex-start;
			padding-top: 1rem;
		}

		.modal-container {
			margin-top: 1rem;
			max-width: calc(100vw - 2rem);
		}

		.merchant-search-input {
			min-height: 44px; /* Ensure proper touch target size */
			font-size: 16px; /* Prevent zoom on iOS */
			-webkit-text-size-adjust: 100%;
			text-size-adjust: 100%;
		}
	}

	/* iOS Safari specific fixes */
	@supports (-webkit-touch-callout: none) {
		.merchant-search-input {
			font-size: 16px;
			-webkit-text-size-adjust: 100%;
			text-size-adjust: 100%;
			-webkit-appearance: none;
			appearance: none;
			border-radius: 0.375rem;
		}

		.modal-backdrop {
			-webkit-overflow-scrolling: touch;
		}
	}

	/* Additional mobile input fixes for very small screens */
	@media (max-width: 480px) {
		.merchant-search-input {
			font-size: 16px;
			-webkit-text-size-adjust: 100%;
			text-size-adjust: 100%;
		}
	}
</style>
