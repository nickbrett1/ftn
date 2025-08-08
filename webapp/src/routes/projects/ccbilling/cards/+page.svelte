<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import Button from '$lib/components/Button.svelte';

	const { data } = $props();

	// Use synchronous destructuring to get data immediately
	const { creditCards = [] } = data;

	// Add card state - use $state() for Svelte 5 reactivity
	let showAddForm = $state(false);
	let newCardName = $state('');
	let newCardLast4 = $state('');
	let isAdding = $state(false);
	let addError = $state('');

	// Delete state
	let deletingCard = $state(null);
	let isDeleting = $state(false);
	let deleteError = $state('');

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

	async function deleteCard(card) {
		if (!confirm(`Are you sure you want to delete "${card.name}" (****${card.last4})?`)) {
			return;
		}

		deletingCard = card;
		isDeleting = true;
		deleteError = '';

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
			deleteError = 'Error deleting card: ' + err.message;
		} finally {
			deletingCard = null;
			isDeleting = false;
		}
	}

	function goToCardDetail(card) {
		window.location.href = `/projects/ccbilling/cards/${card.id}`;
	}
</script>

<PageLayout
	title="Credit Card Management"
	description="Manage your credit cards for billing cycle tracking"
>
	<div class="mb-8">
		<h1 class="text-4xl font-bold">Credit Cards</h1>
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
					<label for="new-card-name" class="block text-gray-300 mb-2"> Card Name: </label>
					<input
						id="new-card-name"
						type="text"
						value={newCardName}
						oninput={(e) => (newCardName = e.target.value)}
						placeholder="e.g., Chase Freedom"
						class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
					/>
				</div>
				<div>
					<label for="new-card-last4" class="block text-gray-300 mb-2"> Last 4 Digits: </label>
					<input
						id="new-card-last4"
						type="text"
						value={newCardLast4}
						oninput={(e) => (newCardLast4 = e.target.value)}
						placeholder="1234"
						maxlength="4"
						class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
					/>
				</div>
			</div>
			<div class="mt-4">
				<button
					type="button"
					class="font-bold rounded bg-green-600 hover:bg-green-700 text-white py-2 px-4 cursor-pointer no-underline not-prose inline-block"
					disabled={isAdding}
					onclick={addCard}
				>
					{isAdding ? 'Adding...' : 'Add Card'}
				</button>
			</div>
		</div>
	{/if}

	<!-- Credit Cards List -->
	{#if !showAddForm}
		{#if creditCards.length === 0}
			<div class="text-center py-8">
				<p class="text-gray-300 mb-4">No credit cards added yet.</p>
				<p class="text-gray-400 text-sm">
					Add your first credit card to start tracking statements.
				</p>
			</div>
		{:else}
			{#if deleteError}
				<div class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
					{deleteError}
				</div>
			{/if}
			<div class="space-y-4">
				{#each creditCards as card (card.id)}
					<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 flex justify-between items-center cursor-pointer hover:bg-gray-700" onclick={() => goToCardDetail(card)}>
						<div>
							<p class="text-white font-semibold text-lg">{card.name}</p>
							<p class="text-gray-400 text-sm">****{card.last4}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<div class="mt-8 flex space-x-4">
		{#if showAddForm}
			<button
				type="button"
				class="font-bold rounded bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-600 hover:border-gray-500 py-3 px-6 text-lg cursor-pointer no-underline not-prose inline-block"
				onclick={() => (showAddForm = false)}
			>
				Cancel
			</button>
		{:else}
			<button
				type="button"
				class="font-bold rounded bg-green-600 hover:bg-green-700 text-white py-2 px-4 cursor-pointer no-underline not-prose inline-block"
				onclick={() => (showAddForm = true)}
			>
				Add Credit Card
			</button>
		{/if}
		<a
			href="/projects/ccbilling"
			class="font-bold rounded bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-600 hover:border-gray-500 py-3 px-6 text-lg cursor-pointer no-underline not-prose inline-block"
			>Back to Billing Cycles</a
		>
	</div>
</PageLayout>
