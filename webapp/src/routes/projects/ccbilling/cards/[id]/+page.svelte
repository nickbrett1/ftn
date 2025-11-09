<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import Button from '$lib/components/Button.svelte';
	import { tick } from 'svelte';

	const { data } = $props();
	const { card } = data;

	let editName = $state(card?.name || '');
	let editLast4 = $state(card?.last4 || '');
	let saveError = $state('');

	let showDeleteDialog = $state(false);
	let isDeleting = $state(false);
	let deleteError = $state('');

	function handleNameInput(e) {
		editName = e.target.value;
		const error = validateCard(editName, editLast4);
		if (error) {
			saveError = error;
		} else {
			saveCardImmediate(editName, editLast4);
		}
	}
	function handleLast4Input(e) {
		editLast4 = e.target.value;
		const error = validateCard(editName, editLast4);
		if (error) {
			saveError = error;
		} else {
			saveCardImmediate(editName, editLast4);
		}
	}
	function validateCard(name, last4) {
		if (!name.trim() || !last4.trim()) {
			return 'Please enter both card name and last 4 digits';
		}
		if (last4.length !== 4 || !/^\d{4}$/.test(last4)) {
			return 'Last 4 digits must be exactly 4 numbers';
		}
		return '';
	}
	async function saveCardImmediate(name, last4) {
		try {
			const response = await fetch(`/projects/ccbilling/cards/${card.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim(), last4: last4.trim() })
			});
			if (!response.ok) {
				const res = await response.json();
				saveError = res.error || 'Failed to update card';
				await tick();
				return;
			}
			// Optionally, show a success indicator
		} catch {
			saveError = 'Network error occurred';
			await tick();
		}
	}

	async function handleDelete() {
		isDeleting = true;
		deleteError = '';
		try {
			const response = await fetch(`/projects/ccbilling/cards/${card.id}`, {
				method: 'DELETE'
			});
			if (!response.ok) {
				const res = await response.json();
				deleteError = res.error || 'Failed to delete card';
				return;
			}
			window.location.href = '/projects/ccbilling/cards';
		} catch {
			deleteError = 'Network error occurred';
		} finally {
			isDeleting = false;
		}
	}
</script>

<PageLayout
	title={`Edit Credit Card - ${card?.name || ''}`}
	description="Edit or delete this credit card."
>
	<div class="mb-8">
		<h1 class="text-4xl font-bold">Edit Credit Card</h1>
	</div>
	<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8 max-w-lg">
		<div class="mb-4">
			<label for="edit-card-name" class="block text-gray-300 mb-2">Card Name:</label>
			<input
				id="edit-card-name"
				type="text"
				value={editName}
				oninput={handleNameInput}
				class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				autocomplete="off"
				maxlength="64"
				data-testid="edit-card-name-input"
			/>
		</div>
		<div class="mb-4">
			<label for="edit-card-last4" class="block text-gray-300 mb-2">Last 4 Digits:</label>
			<input
				id="edit-card-last4"
				type="text"
				value={editLast4}
				oninput={handleLast4Input}
				class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				maxlength="4"
				autocomplete="off"
				data-testid="edit-card-last4-input"
			/>
		</div>
		{#if saveError}
			<div
				class="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4"
				data-testid="save-error"
			>
				{saveError}
			</div>
		{/if}
	</div>
	<div class="mt-8 flex gap-2">
		<Button href="/projects/ccbilling/cards" variant="secondary" size="lg">Back to Cards</Button>
		<Button
			variant="danger"
			size="lg"
			data-testid="delete-card-btn"
			onclick={() => {
				showDeleteDialog = true;
				deleteError = '';
			}}
		>
			Delete Card
		</Button>
	</div>
	{#if showDeleteDialog}
		<div
			class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60"
			data-testid="delete-dialog"
		>
			<div class="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-sm w-full shadow-lg">
				<h3 class="text-lg font-bold text-white mb-4">Delete Credit Card?</h3>
				<p class="text-gray-300 mb-6">
					Are you sure you want to delete this credit card? This action cannot be undone.
				</p>
				{#if deleteError}
					<div
						class="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4"
						data-testid="delete-error"
					>
						{deleteError}
					</div>
				{/if}
				<div class="flex justify-end gap-2">
					<Button
						type="button"
						variant="secondary"
						data-testid="cancel-delete-btn"
						disabled={isDeleting}
						onclick={() => (showDeleteDialog = false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="danger"
						data-testid="confirm-delete-btn"
						disabled={isDeleting}
						onclick={handleDelete}
					>
						{isDeleting ? 'Deleting...' : 'Delete'}
					</Button>
				</div>
			</div>
		</div>
	{/if}
</PageLayout>
