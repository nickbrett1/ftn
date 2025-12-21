<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import Button from '$lib/components/Button.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import {
		getAvailableIcons,
		getIconDescription,
		isIconUsedByOtherBudget,
		getBudgetNameUsingIcon
	} from '$lib/utils/budget-icons.js';

	const { data } = $props();

	// Use derived state to react to data changes
	let budgets = $derived(data.budgets || []);
	// Sort budgets alphabetically by name
	let sortedBudgets = $derived([...budgets].sort((a, b) => a.name.localeCompare(b.name)));

	// Add budget state
	let showAddForm = $state(false);
	let newBudgetName = $state('');
	let newBudgetIcon = $state('');
	let isAdding = $state(false);
	let addError = $state('');

	// Delete state
	let showDeleteDialog = $state(false);
	let budgetToDelete = $state(null);
	let isDeleting = $state(false);
	let deleteError = $state('');

	async function addBudget() {
		if (!newBudgetName.trim()) {
			addError = 'Please enter a budget name';
			return;
		}

		if (!newBudgetIcon) {
			addError = 'Please select an icon';
			return;
		}

		isAdding = true;
		addError = '';

		try {
			const response = await fetch('/projects/ccbilling/budgets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newBudgetName.trim(),
					icon: newBudgetIcon
				})
			});

			if (!response.ok) {
				const error = await response.json();
				addError = error.error || 'Failed to add budget';
				return;
			}

			// Reset form and refresh data
			newBudgetName = '';
			newBudgetIcon = '';
			showAddForm = false;
			globalThis.location.reload();
		} catch {
			addError = 'Network error occurred';
		} finally {
			isAdding = false;
		}
	}

	function cancelAdd() {
		showAddForm = false;
		newBudgetName = '';
		newBudgetIcon = '';
		addError = '';
	}

	async function handleDeleteBudget() {
		if (!budgetToDelete) return;
		isDeleting = true;
		deleteError = '';
		try {
			const response = await fetch(`/projects/ccbilling/budgets/${budgetToDelete.id}`, {
				method: 'DELETE'
			});
			if (!response.ok) {
				const error = await response.json();
				deleteError = error.error || 'Failed to delete budget';
				return;
			}
			globalThis.location.reload();
		} catch {
			deleteError = 'Network error occurred';
		} finally {
			isDeleting = false;
		}
	}
</script>

<Header />

<PageLayout title="Budget Management" description="Manage your budget categories">
	<div class="mb-8">
		<h1 class="text-4xl font-bold">Budget Management</h1>
	</div>

	<!-- Add Budget Form -->
	{#if showAddForm}
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
			<h2 class="text-xl font-semibold text-white mb-4">Add New Budget</h2>
			<div class="space-y-4">
				<div>
					<label for="new-budget-name" class="block text-sm font-medium text-gray-300 mb-2"
						>Budget Name</label
					>
					<input
						id="new-budget-name"
						value={newBudgetName}
						oninput={(e) => (newBudgetName = e.target.value)}
						type="text"
						placeholder="e.g., Groceries, Entertainment, Gas"
						class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						disabled={isAdding}
					/>
				</div>
				<div>
					<p class="block text-sm font-medium text-gray-300 mb-2">Budget Icon</p>
					<div
						class="grid grid-cols-8 gap-2 max-h-96 overflow-y-auto p-2 bg-gray-900 border border-gray-600 rounded-md"
					>
						{#each getAvailableIcons() as icon}
							{@const isUsed = isIconUsedByOtherBudget(icon, budgets)}
							{@const usedByBudget = getBudgetNameUsingIcon(icon, budgets)}
							<button
								type="button"
								onclick={() => (newBudgetIcon = icon)}
								class="p-2 text-2xl rounded transition-colors flex items-center justify-center {newBudgetIcon ===
								icon
									? 'bg-blue-600'
									: isUsed
										? 'bg-gray-700 text-gray-500 cursor-not-allowed'
										: 'bg-gray-800 hover:bg-gray-700'}"
								title={isUsed
									? `${getIconDescription(icon)} (used by ${usedByBudget})`
									: getIconDescription(icon)}
								aria-label={`Select ${getIconDescription(icon)} icon`}
								disabled={isUsed}
							>
								{icon}
							</button>
						{/each}
					</div>
					<p class="text-gray-500 text-xs mt-1">
						Select an icon to represent this budget. Each icon can only be used once.
					</p>
				</div>
				{#if addError}
					<p class="text-red-400 text-sm">{addError}</p>
				{/if}
				<div class="flex space-x-2">
					<Button
						onclick={addBudget}
						variant="success"
						size="md"
						disabled={isAdding}
						style="cursor: pointer;"
					>
						{isAdding ? 'Adding...' : 'Add Budget'}
					</Button>
					<Button onclick={cancelAdd} variant="secondary" size="md" style="cursor: pointer;">
						Cancel
					</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Budgets List -->
	{#if sortedBudgets.length === 0}
		<div class="text-center py-8">
			<p class="text-gray-300 mb-4">No budgets created yet.</p>
			<p class="text-gray-400 text-sm">Create your first budget to start categorizing charges.</p>
		</div>
	{:else}
		<div class="space-y-4 mb-8">
			<h2 class="text-2xl font-semibold text-white">Your Budgets</h2>
			<div class="grid gap-4">
				{#each sortedBudgets as budget (budget.id)}
					<a
						href={`/projects/ccbilling/budgets/${budget.id}`}
						class="block bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer"
					>
						<div class="flex items-center gap-4">
							{#if budget.icon}
								<span class="text-2xl">{budget.icon}</span>
							{/if}
							<div>
								<div class="text-lg font-semibold text-white">{budget.name}</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="mt-8 flex space-x-4">
		{#if !showAddForm}
			<Button
				onclick={() => (showAddForm = true)}
				variant="success"
				size="lg"
				style="cursor: pointer;"
			>
				Add New Budget
			</Button>
		{/if}
		<Button href="/projects/ccbilling" variant="secondary" size="lg">Back to Billing Cycles</Button>
	</div>

	<!-- Custom Delete Confirmation Dialog -->
	{#if showDeleteDialog && budgetToDelete}
		<div class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
			<div class="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-sm w-full shadow-lg">
				<h3 class="text-lg font-bold text-white mb-4">Delete Budget?</h3>
				<p class="text-gray-300 mb-6">
					Are you sure you want to delete the budget "{budgetToDelete.name}"? This action cannot be
					undone.
				</p>
				{#if deleteError}
					<div class="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
						{deleteError}
					</div>
				{/if}
				<div class="flex justify-end gap-2">
					<Button
						type="button"
						variant="secondary"
						disabled={isDeleting}
						onclick={() => (showDeleteDialog = false)}
					>
						Cancel
					</Button>
					<Button type="button" variant="danger" disabled={isDeleting} onclick={handleDeleteBudget}>
						{isDeleting ? 'Deleting...' : 'Delete'}
					</Button>
				</div>
			</div>
		</div>
	{/if}
</PageLayout>

<Footer />
