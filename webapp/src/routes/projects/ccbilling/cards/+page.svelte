<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import Button from '$lib/components/Button.svelte';

	export let data;
	$: ({ creditCards } = data);

	// Add card state
	let showAddForm = false;
	let newCardName = '';
	let newCardLast4 = '';
	let isAdding = false;
	let addError = '';

	// Edit card state
	let editingCard = null;
	let editName = '';
	let editLast4 = '';
	let isEditing = false;
	let editError = '';

	// Delete state
	let deletingCard = null;
	let isDeleting = false;

	async function addCard() {
		if (!newCardName.trim() || !newCardLast4.trim()) {
			addError = 'Please enter both card name and last 4 digits';
			return;
		}

		if (newCardLast4.length !== 4 || !/^\d{4}$/.test(newCardLast4)) {
			addError = 'Last 4 digits must be exactly 4 numbers';
			return;
		}

		isAdding = true;
		addError = '';

		try {
			const response = await fetch('/projects/ccbilling/cards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newCardName.trim(),
					last4: newCardLast4.trim()
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to add credit card');
			}

			// Reset form and refresh page
			newCardName = '';
			newCardLast4 = '';
			showAddForm = false;
			location.reload();
		} catch (err) {
			addError = err.message;
		} finally {
			isAdding = false;
		}
	}

	function startEdit(card) {
		editingCard = card;
		editName = card.name;
		editLast4 = card.last4;
		editError = '';
	}

	function cancelEdit() {
		editingCard = null;
		editName = '';
		editLast4 = '';
		editError = '';
	}

	async function saveEdit() {
		if (!editName.trim() || !editLast4.trim()) {
			editError = 'Please enter both card name and last 4 digits';
			return;
		}

		if (editLast4.length !== 4 || !/^\d{4}$/.test(editLast4)) {
			editError = 'Last 4 digits must be exactly 4 numbers';
			return;
		}

		isEditing = true;
		editError = '';

		try {
			const response = await fetch(`/projects/ccbilling/cards/${editingCard.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editName.trim(),
					last4: editLast4.trim()
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update credit card');
			}

			// Reset form and refresh page
			cancelEdit();
			location.reload();
		} catch (err) {
			editError = err.message;
		} finally {
			isEditing = false;
		}
	}

	async function deleteCard(card) {
		if (!confirm(`Are you sure you want to delete "${card.name}" (****${card.last4})?`)) {
			return;
		}

		deletingCard = card;
		isDeleting = true;

		try {
			const response = await fetch(`/projects/ccbilling/cards/${card.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete credit card');
			}

			location.reload();
		} catch (err) {
			alert('Error deleting card: ' + err.message);
		} finally {
			deletingCard = null;
			isDeleting = false;
		}
	}
</script>

<PageLayout
	title="Credit Card Management"
	description="Manage your credit cards for billing cycle tracking"
>
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-4xl font-bold">Credit Cards</h1>
		<button
			class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
			on:click={() => (showAddForm = !showAddForm)}
		>
			{showAddForm ? 'Cancel' : 'Add Credit Card'}
		</button>
	</div>

	<!-- Add Card Form -->
	{#if showAddForm}
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
			<h3 class="text-xl font-semibold text-white mb-4">Add New Credit Card</h3>
			{#if addError}
				<div class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
					{addError}
				</div>
			{/if}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label class="block text-gray-300 mb-2">
						Card Name:
						<input
							type="text"
							bind:value={newCardName}
							placeholder="e.g., Chase Freedom"
							class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
						/>
					</label>
				</div>
				<div>
					<label class="block text-gray-300 mb-2">
						Last 4 Digits:
						<input
							type="text"
							bind:value={newCardLast4}
							placeholder="1234"
							maxlength="4"
							class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
						/>
					</label>
				</div>
			</div>
			<div class="mt-4">
				<button
					class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
					on:click={addCard}
					disabled={isAdding}
				>
					{isAdding ? 'Adding...' : 'Add Card'}
				</button>
			</div>
		</div>
	{/if}

	<!-- Credit Cards List -->
	{#if creditCards.length === 0}
		<div class="text-center py-8">
			<p class="text-gray-300 mb-4">No credit cards added yet.</p>
			<p class="text-gray-400 text-sm">Add your first credit card to start tracking statements.</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each creditCards as card (card.id)}
				<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
					{#if editingCard?.id === card.id}
						<!-- Edit Form -->
						<div>
							<h3 class="text-lg font-semibold text-white mb-3">Edit Credit Card</h3>
							{#if editError}
								<div class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
									{editError}
								</div>
							{/if}
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
								<div>
									<label class="block text-gray-300 mb-2">
										Card Name:
										<input
											type="text"
											bind:value={editName}
											class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</label>
								</div>
								<div>
									<label class="block text-gray-300 mb-2">
										Last 4 Digits:
										<input
											type="text"
											bind:value={editLast4}
											maxlength="4"
											class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</label>
								</div>
							</div>
							<div class="flex space-x-2">
								<button
									class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
									on:click={saveEdit}
									disabled={isEditing}
								>
									{isEditing ? 'Saving...' : 'Save'}
								</button>
								<button
									class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
									on:click={cancelEdit}
									disabled={isEditing}
								>
									Cancel
								</button>
							</div>
						</div>
					{:else}
						<!-- Display Mode -->
						<div class="flex justify-between items-center">
							<div>
								<h3 class="text-lg font-semibold text-white">{card.name}</h3>
								<p class="text-gray-400">****{card.last4}</p>
								<p class="text-gray-500 text-sm">
									Added: {new Date(card.created_at).toLocaleDateString()}
								</p>
							</div>
							<div class="flex space-x-2">
								<button
									class="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
									on:click={() => startEdit(card)}
								>
									Edit
								</button>
								<button
									class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
									on:click={() => deleteCard(card)}
									disabled={deletingCard?.id === card.id && isDeleting}
								>
									{deletingCard?.id === card.id && isDeleting ? 'Deleting...' : 'Delete'}
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<div class="mt-8">
		<Button href="/projects/ccbilling" variant="secondary">Back to Billing Cycles</Button>
	</div>
</PageLayout>