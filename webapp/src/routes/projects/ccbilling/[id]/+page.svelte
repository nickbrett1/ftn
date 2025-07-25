<script>
	import { page } from '$app/stores';
	export let data;
	$: ({ cycleId, cycle } = data);

	function formatLocalDate(dateString) {
		if (!dateString) return '';
		const [year, month, day] = dateString.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
	}

	import { goto } from '$app/navigation';
	let showDeleteDialog = false;
	let isDeleting = false;
	let deleteError = '';

	async function handleDelete() {
		isDeleting = true;
		deleteError = '';
		try {
			const response = await fetch('/projects/ccbilling/cycles', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: cycleId })
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete billing cycle');
			}
			await goto('/projects/ccbilling');
		} catch (err) {
			deleteError = err.message;
		} finally {
			isDeleting = false;
			showDeleteDialog = false;
		}
	}
</script>

<svelte:head>
	<title>Billing Cycle {cycleId}</title>
	<meta name="description" content="Manage billing cycle details and statements" />
</svelte:head>

<div class="container mx-auto p-4 space-y-8 max-w-6xl">
	<div class="flex justify-between items-start mb-8">
		<div>
			<h2 class="text-3xl font-bold text-white">Billing Cycle: {cycleId}</h2>
			<p class="text-gray-400 mt-2">
				{formatLocalDate(cycle.start_date)} - {formatLocalDate(cycle.end_date)}
			</p>
			<p class="text-sm text-gray-500 mt-1">
				Status: {cycle.closed ? 'Closed' : 'Open'}
			</p>
		</div>
		{#if !cycle.closed}
			<div class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">Active</div>
		{:else}
			<div class="bg-gray-600 text-white px-3 py-1 rounded-full text-sm">Closed</div>
		{/if}
	</div>

	<!-- Delete confirmation dialog -->
	{#if showDeleteDialog}
		<div class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
			<div class="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-sm w-full shadow-lg">
				<h3 class="text-lg font-bold text-white mb-4">Delete Billing Cycle?</h3>
				<p class="text-gray-300 mb-6">
					Are you sure you want to delete this billing cycle? This action cannot be undone.
				</p>
				{#if deleteError}
					<div class="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
						{deleteError}
					</div>
				{/if}
				<div class="flex justify-end gap-2">
					<button
						class="px-4 py-2 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
						on:click={() => (showDeleteDialog = false)}
						disabled={isDeleting}>Cancel</button
					>
					<button
						class="px-4 py-2 rounded bg-red-700 text-white hover:bg-red-800 font-bold"
						on:click={handleDelete}
						disabled={isDeleting}
					>
						{isDeleting ? 'Deleting...' : 'Delete'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Placeholder: Show billing cycle details, list of statements, and payments grid (to be implemented) -->
	<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
		<h3 class="text-xl font-semibold text-white mb-4">Statements</h3>
		<p class="text-gray-300">No statements uploaded yet.</p>
		<p class="text-gray-400 text-sm mt-2">
			Upload credit card statements to begin processing charges.
		</p>
	</div>

	<div class="flex justify-between items-center">
		<div class="space-y-4">
			{#if !cycle.closed}
				<a href="/projects/ccbilling/{cycleId}/upload" class="inline-block">
					<button class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
						Upload Statement PDF
					</button>
				</a>
			{/if}

			<br />

			<a href="/projects/ccbilling" class="link-yellow">Back to Billing Cycles</a>
		</div>

		{#if !cycle.closed}
			<button
				class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
				on:click={() => (showDeleteDialog = true)}
				disabled={isDeleting}
			>
				Delete Billing Cycle
			</button>
		{/if}
	</div>
</div>
