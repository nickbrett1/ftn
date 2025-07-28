<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import Button from '$lib/components/Button.svelte';

	export let data;
	$: ({ budget, merchants } = data);

	// Add merchant state
	let showAddForm = false;
	let newMerchantName = '';
	let isAdding = false;
	let addError = '';

	// Delete merchant state
	let deletingMerchant = null;
	let isDeleting = false;

	// Edit budget name state
	let isEditingName = false;
	let editName = '';
	let isSavingName = false;
	let nameEditError = '';

	// Initialize editName when budget is available
	$: if (budget && !isEditingName) {
		editName = budget.name;
	}

	async function addMerchant() {
		if (!newMerchantName.trim()) {
			addError = 'Please enter a merchant name';
			return;
		}

		isAdding = true;
		addError = '';

		try {
			const response = await fetch(`/projects/ccbilling/budgets/${budget.id}/merchants`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					merchant: newMerchantName.trim()
				})
			});

			if (!response.ok) {
				const error = await response.json();
				addError = error.error || 'Failed to add merchant';
				return;
			}

			// Reset form and refresh data
			newMerchantName = '';
			showAddForm = false;
			window.location.reload();
		} catch (error) {
			addError = 'Network error occurred';
		} finally {
			isAdding = false;
		}
	}

	async function removeMerchant(merchantName) {
		if (!confirm(`Remove "${merchantName}" from this budget?`)) {
			return;
		}

		deletingMerchant = merchantName;
		isDeleting = true;

		try {
			const response = await fetch(`/projects/ccbilling/budgets/${budget.id}/merchants`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					merchant: merchantName
				})
			});

			if (!response.ok) {
				const error = await response.json();
				alert(error.error || 'Failed to remove merchant');
				return;
			}

			// Refresh data
			window.location.reload();
		} catch (error) {
			alert('Network error occurred');
		} finally {
			deletingMerchant = null;
			isDeleting = false;
		}
	}

	function cancelAdd() {
		showAddForm = false;
		newMerchantName = '';
		addError = '';
	}

	function startEditName() {
		isEditingName = true;
		editName = budget.name;
		nameEditError = '';
	}

	function cancelEditName() {
		isEditingName = false;
		editName = budget.name;
		nameEditError = '';
	}

	async function saveBudgetName() {
		if (!editName.trim()) {
			nameEditError = 'Please enter a budget name';
			return;
		}

		isSavingName = true;
		nameEditError = '';

		try {
			const response = await fetch(`/projects/ccbilling/budgets/${budget.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editName.trim()
				})
			});

			if (!response.ok) {
				const error = await response.json();
				nameEditError = error.error || 'Failed to update budget name';
				return;
			}

			// Refresh data to show updated name
			window.location.reload();
		} catch (error) {
			nameEditError = 'Network error occurred';
		} finally {
			isSavingName = false;
		}
	}
</script>

<PageLayout
	title="Budget Details - {budget.name}"
	description="Manage merchant associations for {budget.name}"
>
	<div class="flex justify-between items-center mb-8">
		<div>
			{#if isEditingName}
				<div class="flex items-center space-x-2">
					<label for="budget-name-edit" class="sr-only">Budget Name</label>
					<input
						id="budget-name-edit"
						bind:value={editName}
						type="text"
						class="text-4xl font-bold bg-gray-900 border border-gray-600 rounded-md text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						disabled={isSavingName}
					/>
					<Button
						onclick={saveBudgetName}
						variant="success"
						size="sm"
						disabled={isSavingName}
						style="cursor: pointer;"
					>
						{isSavingName ? 'Saving...' : 'Save'}
					</Button>
					<Button onclick={cancelEditName} variant="secondary" size="sm" style="cursor: pointer;">
						Cancel
					</Button>
				</div>
				{#if nameEditError}
					<p class="text-red-400 text-sm mt-2">{nameEditError}</p>
				{/if}
			{:else}
				<div class="flex flex-col space-y-2">
					<h1 class="text-4xl font-bold">{budget.name}</h1>
					<div class="self-start">
						<Button onclick={startEditName} variant="warning" size="sm" style="cursor: pointer;">
							Edit Name
						</Button>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Budget Info -->
	<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
		<h2 class="text-xl font-semibold text-white mb-4">Budget Information</h2>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<p class="text-gray-400 text-sm">Budget Name</p>
				<p class="text-white font-medium">{budget.name}</p>
			</div>
			<div>
				<p class="text-gray-400 text-sm">Budget ID</p>
				<p class="text-white font-medium">{budget.id}</p>
			</div>
		</div>
	</div>

	<!-- Merchant Auto-Assignment -->
	<div class="mb-8">
		<h2 class="text-2xl font-semibold text-white mb-4">Merchant Auto-Assignment</h2>
		<p class="text-gray-400 mb-6">
			Add merchants to automatically assign charges from these merchants to this budget. When
			charges are parsed from statements, any charges from these merchants will be automatically
			categorized under "{budget.name}".
		</p>

		<!-- Add Merchant Form -->
		{#if showAddForm}
			<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
				<h3 class="text-lg font-semibold text-white mb-4">Add Merchant</h3>
				<div class="space-y-4">
					<div>
						<label for="merchant-name-input" class="block text-sm font-medium text-gray-300 mb-2"
							>Merchant Name</label
						>
						<input
							id="merchant-name-input"
							bind:value={newMerchantName}
							type="text"
							placeholder="e.g., Amazon, Walmart, Target"
							class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							disabled={isAdding}
						/>
						<p class="text-gray-500 text-xs mt-1">
							Enter the merchant name as it appears on your credit card statements
						</p>
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
						<Button onclick={cancelAdd} variant="secondary" size="md" style="cursor: pointer;">
							Cancel
						</Button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Merchants List -->
		{#if merchants.length === 0}
			<div class="text-center py-8 bg-gray-800 border border-gray-700 rounded-lg">
				<p class="text-gray-300 mb-2">No merchants assigned to this budget yet.</p>
				<p class="text-gray-400 text-sm">
					Add merchants to automatically categorize charges from those merchants under this budget.
				</p>
			</div>
		{:else}
			<div class="space-y-2">
				<h3 class="text-lg font-semibold text-white">Assigned Merchants ({merchants.length})</h3>
				<div class="grid gap-3">
					{#each merchants as merchant (merchant.merchant)}
						<div
							class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex justify-between items-center"
						>
							<div>
								<p class="text-white font-medium">{merchant.merchant}</p>
								<p class="text-gray-400 text-sm">
									Charges from this merchant will be auto-assigned to "{budget.name}"
								</p>
							</div>
							<Button
								onclick={() => removeMerchant(merchant.merchant)}
								variant="danger"
								size="sm"
								disabled={isDeleting && deletingMerchant === merchant.merchant}
								style="cursor: pointer;"
							>
								{isDeleting && deletingMerchant === merchant.merchant ? 'Removing...' : 'Remove'}
							</Button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Add Merchant Button -->
		{#if !showAddForm}
			<div class="mt-6">
				<Button
					onclick={() => (showAddForm = true)}
					variant="success"
					size="lg"
					style="cursor: pointer;"
				>
					Add Merchant
				</Button>
			</div>
		{/if}
	</div>

	<!-- Future Features Info -->
	<div class="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
		<h3 class="text-lg font-semibold text-blue-300 mb-2">Coming Soon</h3>
		<ul class="text-blue-200 text-sm space-y-1">
			<li>• View charges assigned to this budget</li>
			<li>• Budget spending analytics</li>
			<li>• Monthly budget limits and tracking</li>
		</ul>
	</div>
	<Button href="/projects/ccbilling/budgets" variant="secondary" size="lg">Back to Budgets</Button>
</PageLayout>
