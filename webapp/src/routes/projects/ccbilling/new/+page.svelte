<script>
	import Button from '$lib/components/Button.svelte';
	import { goto } from '$app/navigation';

	let startDate = '';
	let endDate = '';
	let isSubmitting = false;
	let error = '';

	// Set default dates
	$: if (!startDate) {
		// Default to today
		startDate = new Date().toISOString().split('T')[0];
	}
	$: if (!endDate) {
		// Default to today
		endDate = new Date().toISOString().split('T')[0];
	}

	async function createBillingCycle() {
		if (!startDate || !endDate) {
			error = 'Please select both start and end dates';
			return;
		}

		if (new Date(startDate) > new Date(endDate)) {
			error = 'Start date must be before end date';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const response = await fetch('/projects/ccbilling/cycles', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					start_date: startDate,
					end_date: endDate
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create billing cycle');
			}

			// Redirect to the main billing cycles page
			await goto('/projects/ccbilling');
		} catch (err) {
			error = err.message;
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create New Billing Cycle</title>
	<meta name="description" content="Create a new billing cycle for credit card statements" />
</svelte:head>

<div class="container mx-auto p-4 space-y-8 max-w-4xl">
	<h2 class="text-3xl font-bold text-white mb-8">Create New Billing Cycle</h2>

	<form on:submit|preventDefault={createBillingCycle} class="space-y-6">
		{#if error}
			<div class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
				{error}
			</div>
		{/if}

		<div>
			<label class="block text-gray-300 mb-2">
				Start Date:
				<input
					type="date"
					bind:value={startDate}
					required
					class="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
				/>
			</label>
		</div>

		<div>
			<label class="block text-gray-300 mb-2">
				End Date:
				<input
					type="date"
					bind:value={endDate}
					required
					class="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
				/>
			</label>
		</div>

		<Button type="submit" variant="success" size="lg" disabled={isSubmitting}>
			{isSubmitting ? 'Creating...' : 'Create Billing Cycle'}
		</Button>
	</form>

	<Button href="/projects/ccbilling" variant="secondary" size="lg">Back to Billing Cycles</Button>
</div>
