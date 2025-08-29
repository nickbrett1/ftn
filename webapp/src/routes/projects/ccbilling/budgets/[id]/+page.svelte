<script>
	import { invalidateAll } from '$app/navigation';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import Button from '$lib/components/Button.svelte';
	import MerchantPicker from '$lib/components/MerchantPicker.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import {
		getAvailableIcons,
		getIconDescription,
		isIconUsedByOtherBudget,
		getBudgetNameUsingIcon
	} from '$lib/utils/budget-icons.js';

	const { data } = $props();

	// Simple variables - only use $state for UI-reactive variables
	let budget = data.budget || null;
	let budgets = data.budgets || [];
	let merchants = $state(data.merchants || []); // UI needs to react to merchant changes
	
	// Add merchant state
	let selectedMerchant = ''; // Non-reactive to avoid infinite loops
	let isAdding = $state(false); // UI needs to show loading state
	let addError = $state(''); // UI needs to show errors
	let merchantPickerRef = null; // No UI reactivity needed

	// Delete merchant state - using individual $state variables for better reactivity
	let deletingMerchant = $state(null);
	let isDeleting = $state(false);

	// Edit budget name and icon state
	let editName = $state(budget?.name || ''); // UI needs to react to name changes
	let editIcon = $state(budget?.icon || ''); // UI needs to react to icon changes
	let isSavingName = $state(false); // UI needs to show loading state
	let nameEditError = $state(''); // UI needs to show errors

	// Delete budget state
	let showDeleteDialog = $state(false); // UI needs to show/hide dialog
	let isDeletingBudget = $state(false); // UI needs to show loading state
	let deleteBudgetError = $state(''); // UI needs to show errors

	// Get available icons
	let availableIcons = getAvailableIcons();

		async function addMerchant() {
		console.log('🔍 DEBUG: addMerchant called with selectedMerchant:', selectedMerchant);
		console.log('🔍 DEBUG: Current merchants before addition:', merchants.map(m => m.merchant));
		
		// Prevent running if already adding
		if (isAdding) {
			console.log('🔍 DEBUG: Already adding, returning early');
			return;
		}
		
		if (!selectedMerchant.trim()) {
			addError = 'Please select a merchant';
			return;
		}

		isAdding = true;
		addError = '';

		console.log('🔍 DEBUG: Starting merchant addition, isAdding set to:', isAdding);

		try {
			const url = `/projects/ccbilling/budgets/${budget.id}/merchants`;
			const requestBody = JSON.stringify({
				merchant: selectedMerchant.trim()
			});
			
			console.log('🔍 DEBUG: Making POST request to:', url);
			console.log('🔍 DEBUG: Request body:', requestBody);
			
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: requestBody
			});

			console.log('🔍 DEBUG: Add response received:', {
				ok: response.ok,
				status: response.status,
				statusText: response.statusText
			});

			if (!response.ok) {
				const error = await response.json();
				console.log('🔍 DEBUG: Add failed with error:', error);
				addError = error.error || 'Failed to add merchant';
				isAdding = false;
				return;
			}

			console.log('🔍 DEBUG: Add successful, updating UI state');
			
			// Add the merchant to the local UI state
			const newMerchant = {
				merchant: selectedMerchant.trim(),
				merchant_normalized: selectedMerchant.trim() // Keep original case for display
			};
			
			console.log('🔍 DEBUG: New merchant object:', newMerchant);
			console.log('🔍 DEBUG: Merchants before addition:', merchants.map(m => m.merchant));
			
			merchants = [...merchants, newMerchant].sort((a, b) => 
				a.merchant.toLowerCase().localeCompare(b.merchant.toLowerCase())
			);
			
			console.log('🔍 DEBUG: Merchants after addition and sort:', merchants.map(m => m.merchant));
			
			// Note: No longer need to update picker state - modal will fetch fresh data when opened
			
			// Reset form and loading state
			selectedMerchant = '';
			isAdding = false;
			
			console.log('🔍 DEBUG: Reset selectedMerchant to:', selectedMerchant, 'isAdding to:', isAdding);
			
			// Manually reset the select element to ensure it's cleared
			if (merchantPickerRef && merchantPickerRef.syncSelectValue) {
				console.log('🔍 DEBUG: Calling syncSelectValue to reset select element');
				merchantPickerRef.syncSelectValue();
			}
			
			// Small delay to ensure DOM updates are complete
			setTimeout(() => {
				console.log('🔍 DEBUG: DOM update delay completed');
				// This ensures the UI is fully updated before allowing further interactions
			}, 10);
			
			// Note: Removed syncSelectValue() call as it might interfere with DOM event handlers
			// The merchant picker will sync automatically when needed
			
			// Note: Removed refreshMerchantList() call as it might be causing DOM manipulation
			// issues that interfere with event handlers. The modal will fetch fresh data when opened.
		} catch (error) {
			console.log('🔍 DEBUG: Add merchant exception:', error);
			addError = 'Network error occurred';
			isAdding = false;
		}
	}

		async function removeMerchant(merchantName) {
		console.log('🔍 DEBUG: removeMerchant called with:', merchantName);
		console.log('🔍 DEBUG: Current merchants before removal:', merchants.map(m => m.merchant));
		console.log('🔍 DEBUG: Current UI state - isDeleting:', isDeleting, 'deletingMerchant:', deletingMerchant);
		
		// No confirm needed; removal is safe and reversible by re-adding
		deletingMerchant = merchantName;
		isDeleting = true;

		console.log('🔍 DEBUG: Set deletingMerchant to:', deletingMerchant, 'isDeleting to:', isDeleting);

		try {
			const url = `/projects/ccbilling/budgets/${budget.id}/merchants`;
			const requestBody = JSON.stringify({ merchant: merchantName });
			
			console.log('🔍 DEBUG: Making DELETE request to:', url);
			console.log('🔍 DEBUG: Request body:', requestBody);
			
			const response = await fetch(url, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: requestBody
			});

			console.log('🔍 DEBUG: Response received:', {
				ok: response.ok,
				status: response.status,
				statusText: response.statusText
			});

			if (!response.ok) {
				let errorDetails = `HTTP ${response.status}: ${response.statusText}`;
				try {
					const errorBody = await response.text();
					console.log('❌ Error response body:', errorBody);
					errorDetails += `\nResponse: ${errorBody}`;
				} catch (e) {
					console.log('❌ Could not read error response body:', e);
				}
				console.log('🔍 DEBUG: API call failed, showing alert');
				alert(`Failed to remove merchant "${merchantName}":\n\n${errorDetails}\n\nCheck console for full details.`);
				return;
			}

			console.log('🔍 DEBUG: API call successful, updating UI state');
			console.log('🔍 DEBUG: Merchants before filter:', merchants.map(m => m.merchant));
			
			// Remove the merchant from the local UI state
			const merchantsBefore = merchants.length;
			// ENHANCED FIX: Force reactivity with multiple approaches
			const filteredMerchants = merchants.filter(merchant => merchant.merchant !== merchantName);
			merchants = filteredMerchants; // Direct assignment to trigger reactivity
			const merchantsAfter = merchants.length;
			
			// Additional debugging to understand the production issue
			console.log('🔍 DEBUG: Reactivity check - merchants array reference changed:', 
				merchants !== merchants, 'Length:', merchants.length);
			console.log('🔍 DEBUG: DOM elements before update:', 
				document.querySelectorAll('.merchant-list .merchant-item').length);
			
			console.log('🔍 DEBUG: Merchants after filter:', merchants.map(m => m.merchant));
			console.log('🔍 DEBUG: Merchant count changed from', merchantsBefore, 'to', merchantsAfter);
			console.log('🔍 DEBUG: Merchant removed successfully:', merchantsBefore > merchantsAfter);
			
			// Force UI update by triggering a small delay
			setTimeout(() => {
				console.log('🔍 DEBUG: Forcing UI update after merchant removal');
				console.log('🔍 DEBUG: DOM elements after update:', 
					document.querySelectorAll('.merchant-list .merchant-item').length);
				console.log('🔍 DEBUG: Merchant list HTML content:', 
					document.querySelector('.merchant-list')?.textContent?.substring(0, 200));
				
				// Check if the merchant is still visible in the DOM
				const merchantStillVisible = document.querySelector('.merchant-list')?.textContent?.includes(merchantName);
				console.log('🔍 DEBUG: Merchant still visible in DOM after removal:', merchantStillVisible);
				
				// This ensures the UI re-renders with the updated merchants array
			}, 10);
			
			// Note: No longer need to update picker state - modal will fetch fresh data when opened
		} catch (error) {
			console.error('❌ Merchant removal failed:', {
				error: error.message,
				merchantName,
				budgetId: budget.id,
				stack: error.stack
			});
			
			// Show detailed error message for debugging
			alert(`Failed to remove merchant "${merchantName}":\n\n${error.message}\n\nCheck console for full details.`);
		} finally {
			console.log('🔍 DEBUG: Finally block - resetting state');
			deletingMerchant = null;
			isDeleting = false;
			console.log('🔍 DEBUG: State reset - isDeleting:', isDeleting, 'deletingMerchant:', deletingMerchant);
		}
	}

	function validateBudgetNameAndIcon(name, icon) {
		if (!name.trim()) {
			return 'Please enter a budget name';
		}
		if (!icon) {
			return 'Please select a budget icon';
		}
		if (isIconUsedByOtherBudget(icon, data.budgets || [], budget?.id)) {
			return 'This icon is already used by another budget';
		}
		return '';
	}

	async function saveBudgetNameImmediate(name, icon) {
		isSavingName = true;
		nameEditError = '';
		try {
			const response = await fetch(`/projects/ccbilling/budgets/${budget.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim(), icon })
			});
			if (!response.ok) {
				const error = await response.json();
				nameEditError = error.error || 'Failed to update budget';
				return;
			}
			// No reload, just update UI
		} catch (error) {
			nameEditError = 'Network error occurred';
		} finally {
			isSavingName = false;
		}
	}

	function handleNameInput(e) {
		editName = e.target.value;
		const error = validateBudgetNameAndIcon(editName, editIcon);
		nameEditError = error;
		if (!error) {
			saveBudgetNameImmediate(editName, editIcon);
		}
	}

	function handleIconSelect(icon) {
		editIcon = icon;
		const error = validateBudgetNameAndIcon(editName, editIcon);
		nameEditError = error;
		if (!error) {
			saveBudgetNameImmediate(editName, editIcon);
		}
	}

	async function handleDeleteBudget() {
		isDeletingBudget = true;
		deleteBudgetError = '';
		try {
			const response = await fetch(`/projects/ccbilling/budgets/${budget.id}`, {
				method: 'DELETE'
			});
			if (!response.ok) {
				const error = await response.json();
				deleteBudgetError = error.error || 'Failed to delete budget';
				return;
			}
			window.location.href = '/projects/ccbilling/budgets';
		} catch (error) {
			deleteBudgetError = 'Network error occurred';
		} finally {
			isDeletingBudget = false;
		}
	}
</script>

<Header />

<PageLayout
	title="Budget Details - {budget?.name || 'Loading...'}"
	description="Manage merchant associations for {budget?.name || 'this budget'}"
>
	<div class="flex justify-between items-center mb-8">
		<div>
			<h1 class="text-4xl font-bold">{budget?.name || 'Loading...'}</h1>
		</div>
		<div>
			<Button href="/projects/ccbilling/budgets" variant="secondary" size="lg">Back to Budgets</Button>
		</div>
	</div>

	<!-- Budget Info -->
	<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
		<h2 class="text-xl font-semibold text-white mb-4">Budget Information</h2>
		<div class="space-y-4">
			<div>
				<label for="budget-name-edit" class="block text-sm font-medium text-gray-300 mb-2"
					>Budget Name</label
				>
				<input
					id="budget-name-edit"
					value={editName}
					oninput={handleNameInput}
					type="text"
					class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					disabled={isSavingName}
				/>
			</div>
			<div>
				<p class="block text-sm font-medium text-gray-300 mb-2">Budget Icon</p>
				<div
					class="grid grid-cols-8 gap-2 max-h-96 overflow-y-auto p-2 bg-gray-900 border border-gray-600 rounded-md"
				>
					{#each getAvailableIcons() as icon}
						{@const isUsed = isIconUsedByOtherBudget(icon, data.budgets || [], budget?.id)}
						{@const usedByBudget = getBudgetNameUsingIcon(icon, data.budgets || [], budget?.id)}
						<button
							type="button"
							onclick={() => handleIconSelect(icon)}
							class="p-2 text-2xl rounded transition-colors flex items-center justify-center {editIcon === icon ? 'bg-blue-600' : isUsed ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700'} {isSavingName ? 'opacity-50' : ''}"
							title={isUsed ? `${getIconDescription(icon)} (used by ${usedByBudget})` : getIconDescription(icon)}
							aria-label={`Select ${getIconDescription(icon)} icon`}
							disabled={isUsed || isSavingName}
						>
							{icon}
						</button>
					{/each}
				</div>
			</div>
			{#if nameEditError}
				<p class="text-red-400 text-sm">{nameEditError}</p>
			{/if}
		</div>
	</div>

	<!-- Merchant Auto-Assignment -->
	<div class="mb-8 merchant-container">
		<h2 class="text-2xl font-semibold text-white mb-4">Merchant Auto-Assignment</h2>
		<p class="text-gray-400 mb-6">
			Add merchants to automatically assign charges from these merchants to this budget. When
			charges are parsed from statements, any charges from these merchants will be automatically
			categorized under "{budget?.name || 'this budget'}".
		</p>

		<!-- Add Merchant Form -->
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
			<h3 class="text-lg font-semibold text-white mb-4">Add Merchant</h3>
			<div class="space-y-4">
				<div>
									<MerchantPicker
					{selectedMerchant}
					onSelect={(merchant) => (selectedMerchant = merchant)}
					placeholder="Choose a merchant to assign to this budget..."
					bind:this={merchantPickerRef}
				/>
				</div>
				{#if addError}
					<p class="text-red-400 text-sm">{addError}</p>
				{/if}

				<div class="flex space-x-2">
					<Button
						onclick={addMerchant}
						variant="success"
						size="md"
						disabled={isAdding}
						style="cursor: pointer;"
					>
						{isAdding ? 'Adding...' : 'Add Merchant'}
					</Button>
				</div>
			</div>
		</div>

		<!-- Merchants List -->
		{#if merchants.length === 0}
			<div class="text-center py-8 bg-gray-800 border border-gray-700 rounded-lg">
				<p class="text-gray-300 mb-2">No merchants assigned to this budget yet.</p>
				<p class="text-gray-400 text-sm">
					Add merchants to automatically categorize charges from those merchants under this budget.
				</p>
			</div>
		{:else}
			<div class="space-y-2 merchant-list">
				<h3 class="text-lg font-semibold text-white">Assigned Merchants ({merchants.length})</h3>
				<div class="grid gap-3">
					{#each merchants as merchant (merchant.merchant_normalized || merchant.merchant)}
						<div
							class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex justify-between items-center"
						>
							<div>
								<p class="text-white font-medium">{merchant.merchant_normalized || merchant.merchant}</p>
								<p class="text-gray-400 text-sm">
									Charges from this merchant will be auto-assigned to "{budget?.name ||
										'this budget'}"
								</p>
							</div>
							<button
								onclick={() => removeMerchant(merchant.merchant_normalized || merchant.merchant)}
								class="font-bold rounded bg-red-600 hover:bg-red-700 text-white py-1 px-3 text-sm cursor-pointer"
								disabled={isDeleting && deletingMerchant === (merchant.merchant_normalized || merchant.merchant)}
								style="cursor: pointer;"
							>
								{isDeleting && deletingMerchant === (merchant.merchant_normalized || merchant.merchant) ? 'Removing...' : 'Remove'}
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Delete confirmation dialog -->
	{#if showDeleteDialog}
		<div class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
			<div class="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-sm w-full shadow-lg">
				<h3 class="text-lg font-bold text-white mb-4">Delete Budget?</h3>
				<p class="text-gray-300 mb-6">
					Are you sure you want to delete this budget? This action cannot be undone.
				</p>
				{#if deleteBudgetError}
					<div class="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
						{deleteBudgetError}
					</div>
				{/if}
				<div class="flex justify-end gap-2">
					<Button
						type="button"
						variant="secondary"
						disabled={isDeletingBudget}
						onclick={() => (showDeleteDialog = false)}
					>
						Cancel
					</Button>
					<Button type="button" variant="danger" disabled={isDeletingBudget} onclick={handleDeleteBudget}>
						{isDeletingBudget ? 'Deleting...' : 'Delete'}
					</Button>
				</div>
			</div>
		</div>
	{/if}
</PageLayout>

<Footer />
