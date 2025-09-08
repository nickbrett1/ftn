<script>
	import { invalidateAll } from '$app/navigation';
	import { SvelteSet } from 'svelte/reactivity';
	import { tick } from 'svelte';
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

	// Core data - reactive state
	let budget = $state(data.budget || null);
	let budgets = $state(data.budgets || []);
	let merchants = $state(new SvelteSet(data.merchants || []));

	// Merchant management state
	let selectedMerchant = $state('');
	let isAdding = $state(false);
	let addError = $state('');
	let deletingMerchant = $state(null);
	let isDeleting = $state(false);
	let merchantPickerRef = null;

	// Budget editing state
	let editName = $state(budget?.name || '');
	let editIcon = $state(budget?.icon || '');
	let isSavingName = $state(false);
	let nameEditError = $state('');

	// Budget deletion state
	let showDeleteDialog = $state(false);
	let isDeletingBudget = $state(false);
	let deleteBudgetError = $state('');

	// Derived state for UI
	let availableIcons = $derived(getAvailableIcons());
	let sortedMerchants = $derived(
		Array.from(merchants)
			.filter((merchant) => merchant && merchant.merchant)
			.sort((a, b) => a.merchant.toLowerCase().localeCompare(b.merchant.toLowerCase()))
	);

	// Derived set of assigned merchant names for reactive filtering
	let assignedMerchantNames = $derived(
		new Set(
			Array.from(merchants)
				.filter((m) => m && m.merchant)
				.map((m) => m.merchant.toLowerCase())
		)
	);

	async function addMerchant() {
		if (isAdding || !selectedMerchant?.trim()) {
			if (!selectedMerchant?.trim()) {
				addError = 'Please select a merchant';
			}
			return;
		}

		// Check if merchant already exists
		const merchantExists = Array.from(merchants).some(
			(merchant) => merchant.merchant.toLowerCase() === selectedMerchant.trim().toLowerCase()
		);
		if (merchantExists) {
			addError = 'This merchant is already assigned to this budget';
			return;
		}

		try {
			isAdding = true;
			addError = '';

			const response = await fetch(`/projects/ccbilling/budgets/${budget.id}/merchants`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ merchant: selectedMerchant.trim() })
			});

			if (!response.ok) {
				const error = await response.json();
				addError = error.error || 'Failed to add merchant';
				return;
			}

			// Add to reactive collection
			merchants.add({
				merchant: selectedMerchant.trim(),
				merchant_normalized: selectedMerchant.trim()
			});

			// Reset form
			selectedMerchant = '';

			// Wait for DOM updates to complete, then refresh the merchant list
			await tick();
			merchantPickerRef?.refreshMerchantList();
		} catch (error) {
			addError = 'Network error occurred';
		} finally {
			isAdding = false;
		}
	}

	async function removeMerchant(merchantName) {
		if (isDeleting) return;

		deletingMerchant = merchantName;
		isDeleting = true;

		try {
			const response = await fetch(`/projects/ccbilling/budgets/${budget.id}/merchants`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ merchant: merchantName })
			});

			if (!response.ok) {
				const errorText = await response.text();
				alert(
					`Failed to remove merchant "${merchantName}": ${response.status} ${response.statusText}\n${errorText}`
				);
				return;
			}

			// Remove from reactive collection - create a new set to avoid iteration issues
			const newMerchants = new SvelteSet();
			for (const merchant of merchants) {
				if (merchant.merchant !== merchantName) {
					newMerchants.add(merchant);
				}
			}
			merchants = newMerchants;

			// Refresh picker to re-add removed merchant to list
			// Tell the picker to refresh its merchant list
			merchantPickerRef?.refreshMerchantList();
		} catch (error) {
			alert(`Failed to remove merchant "${merchantName}": ${error.message}`);
		} finally {
			deletingMerchant = null;
			isDeleting = false;
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
			<Button href="/projects/ccbilling/budgets" variant="secondary" size="lg"
				>Back to Budgets</Button
			>
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
							class="p-2 text-2xl rounded transition-colors flex items-center justify-center {editIcon ===
							icon
								? 'bg-blue-600'
								: isUsed
									? 'bg-gray-700 text-gray-500 cursor-not-allowed'
									: 'bg-gray-800 hover:bg-gray-700'} {isSavingName ? 'opacity-50' : ''}"
							title={isUsed
								? `${getIconDescription(icon)} (used by ${usedByBudget})`
								: getIconDescription(icon)}
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
						assignedMerchants={assignedMerchantNames}
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
		{#if merchants.size === 0}
			<div class="text-center py-8 bg-gray-800 border border-gray-700 rounded-lg">
				<p class="text-gray-300 mb-2">No merchants assigned to this budget yet.</p>
				<p class="text-gray-400 text-sm">
					Add merchants to automatically categorize charges from those merchants under this budget.
				</p>
			</div>
		{:else}
			<div class="space-y-2 merchant-list">
				<h3 class="text-lg font-semibold text-white">Assigned Merchants ({merchants.size})</h3>
				<div class="grid gap-3">
					{#each sortedMerchants as merchant, index (merchant.merchant_normalized || merchant.merchant)}
						<div
							class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex justify-between items-center"
						>
							<div>
								<p class="text-white font-medium">
									{merchant.merchant_normalized || merchant.merchant}
								</p>
								<p class="text-gray-400 text-sm">
									Charges from this merchant will be auto-assigned to "{budget?.name ||
										'this budget'}"
								</p>
							</div>
							<button
								onclick={() => removeMerchant(merchant.merchant_normalized || merchant.merchant)}
								class="font-bold rounded bg-red-600 hover:bg-red-700 text-white py-1 px-3 text-sm cursor-pointer"
								disabled={isDeleting &&
									deletingMerchant === (merchant.merchant_normalized || merchant.merchant)}
								style="cursor: pointer;"
							>
								{isDeleting &&
								deletingMerchant === (merchant.merchant_normalized || merchant.merchant)
									? 'Removing...'
									: 'Remove'}
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
					<Button
						type="button"
						variant="danger"
						disabled={isDeletingBudget}
						onclick={handleDeleteBudget}
					>
						{isDeletingBudget ? 'Deleting...' : 'Delete'}
					</Button>
				</div>
			</div>
		</div>
	{/if}
</PageLayout>

<Footer />
