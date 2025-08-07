<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import Button from '$lib/components/Button.svelte';
	import {
		getAvailableIcons,
		getIconDescription,
		getDefaultIcon,
		getAvailableIconsForBudget,
		isIconUsedByOtherBudget,
		getBudgetNameUsingIcon
	} from '$lib/utils/budget-icons.js';

	const { data } = $props();

	// Use synchronous destructuring to get data immediately
	const { budgets = [] } = data;

	// Add budget state
	let showAddForm = $state(false);
	let newBudgetName = $state('');
	let newBudgetIcon = $state('');
	let isAdding = $state(false);
	let addError = $state('');

	// Edit budget state
	let editingBudget = $state(null);
	let editName = $state('');
	let editIcon = $state('');
	let isEditing = $state(false);
	let editError = $state('');

	// Delete state
	let deletingBudget = $state(null);
	let isDeleting = $state(false);

	// Get available icons (excluding those already used by other budgets)
	let availableIcons = $derived(getAvailableIconsForBudget(budgets));

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
			window.location.reload();
		} catch (error) {
			addError = 'Network error occurred';
		} finally {
			isAdding = false;
		}
	}

	function startEdit(budget) {
		editingBudget = budget;
		editName = budget.name;
		editIcon = budget.icon || '';
		editError = '';
	}

	function cancelEdit() {
		editingBudget = null;
		editName = '';
		editIcon = '';
		editError = '';
	}

	async function saveBudget() {
		if (!editName.trim()) {
			editError = 'Please enter a budget name';
			return;
		}

		if (!editIcon) {
			editError = 'Please select an icon';
			return;
		}

		isEditing = true;
		editError = '';

		try {
			const response = await fetch(`/projects/ccbilling/budgets/${editingBudget.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editName.trim(),
					icon: editIcon
				})
			});

			if (!response.ok) {
				const error = await response.json();
				editError = error.error || 'Failed to update budget';
				return;
			}

			// Reset form and refresh data
			editingBudget = null;
			editName = '';
			editIcon = '';
			window.location.reload();
		} catch (error) {
			editError = 'Network error occurred';
		} finally {
			isEditing = false;
		}
	}

	async function deleteBudget(budget) {
		if (!confirm(`Are you sure you want to delete the budget "${budget.name}"?`)) {
			return;
		}

		deletingBudget = budget;
		isDeleting = true;

		try {
			const response = await fetch(`/projects/ccbilling/budgets/${budget.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json();
				alert(error.error || 'Failed to delete budget');
				return;
			}

			// Refresh data
			window.location.reload();
		} catch (error) {
			alert('Network error occurred');
		} finally {
			deletingBudget = null;
			isDeleting = false;
		}
	}

	function cancelAdd() {
		showAddForm = false;
		newBudgetName = '';
		newBudgetIcon = '';
		addError = '';
	}
</script>

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
						class="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-900 border border-gray-600 rounded-md"
					>
						{#each getAvailableIcons() as icon}
							{@const isUsed = isIconUsedByOtherBudget(icon, budgets)}
							{@const usedByBudget = getBudgetNameUsingIcon(icon, budgets)}
							<button
								type="button"
								onclick={() => (newBudgetIcon = icon)}
								class="p-2 text-2xl rounded transition-colors {newBudgetIcon === icon
									? 'bg-blue-600'
									: isUsed
									? 'bg-gray-700 text-gray-500 cursor-not-allowed'
									: 'bg-gray-800 hover:bg-gray-700'}"
								title={isUsed ? `${getIconDescription(icon)} (used by ${usedByBudget})` : getIconDescription(icon)}
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
	{#if budgets.length === 0}
		<div class="text-center py-8">
			<p class="text-gray-300 mb-4">No budgets created yet.</p>
			<p class="text-gray-400 text-sm">Create your first budget to start categorizing charges.</p>
		</div>
	{:else}
		<div class="space-y-4 mb-8">
			<h2 class="text-2xl font-semibold text-white">Your Budgets</h2>
			<div class="grid gap-4">
				{#each budgets as budget (budget.id)}
					<div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
						{#if editingBudget?.id === budget.id}
							<!-- Edit form -->
							<div class="space-y-4">
								<div>
									<label for="edit-budget-name" class="block text-sm font-medium text-gray-300 mb-2"
										>Budget Name</label
									>
									<input
										id="edit-budget-name"
										value={editName}
										oninput={(e) => (editName = e.target.value)}
										type="text"
										class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										disabled={isEditing}
									/>
								</div>
								<div>
									<p class="block text-sm font-medium text-gray-300 mb-2">Budget Icon</p>
									<div
										class="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-900 border border-gray-600 rounded-md"
									>
										{#each getAvailableIcons() as icon}
											{@const isUsed = isIconUsedByOtherBudget(icon, budgets, budget.id)}
											{@const usedByBudget = getBudgetNameUsingIcon(icon, budgets, budget.id)}
											<button
												type="button"
												onclick={() => (editIcon = icon)}
												class="p-2 text-2xl rounded transition-colors {editIcon === icon
													? 'bg-blue-600'
													: isUsed
													? 'bg-gray-700 text-gray-500 cursor-not-allowed'
													: 'bg-gray-800 hover:bg-gray-700'}"
												title={isUsed ? `${getIconDescription(icon)} (used by ${usedByBudget})` : getIconDescription(icon)}
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
								{#if editError}
									<p class="text-red-400 text-sm">{editError}</p>
								{/if}
								<div class="flex space-x-2">
									<Button
										onclick={saveBudget}
										variant="success"
										size="sm"
										disabled={isEditing}
										style="cursor: pointer;"
									>
										{isEditing ? 'Saving...' : 'Save'}
									</Button>
									<Button
										onclick={cancelEdit}
										variant="secondary"
										size="sm"
										style="cursor: pointer;"
									>
										Cancel
									</Button>
								</div>
							</div>
						{:else}
							<!-- Display mode -->
							<div class="flex justify-between items-center">
								<div class="flex items-center space-x-3">
									{#if budget.icon}
										<span class="text-2xl">{budget.icon}</span>
									{/if}
									<a
										href="/projects/ccbilling/budgets/{budget.id}"
										class="text-lg font-medium text-white hover:text-green-400 cursor-pointer"
									>
										{budget.name}
									</a>
								</div>
								<div class="flex space-x-2">
									<Button
										href="/projects/ccbilling/budgets/{budget.id}"
										variant="warning"
										size="sm"
										style="cursor: pointer;"
									>
										Edit
									</Button>
									<Button
										onclick={() => deleteBudget(budget)}
										variant="danger"
										size="sm"
										disabled={isDeleting && deletingBudget?.id === budget.id}
										style="cursor: pointer;"
									>
										{isDeleting && deletingBudget?.id === budget.id ? 'Deleting...' : 'Delete'}
									</Button>
								</div>
							</div>
						{/if}
					</div>
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
</PageLayout>
