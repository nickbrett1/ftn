<script>
	import Button from '$lib/components/Button.svelte';

	// Placeholder: Logic for creating a new billing cycle (to be implemented)
	let startDate = '';
	let endDate = '';

	function createBillingCycle() {
		// To be implemented: Call backend to create billing cycle
		alert(`Create billing cycle: ${startDate} to ${endDate}`);
	}
</script>

<svelte:head>
	<title>Create New Billing Cycle</title>
	<meta name="description" content="Create a new billing cycle for credit card statements" />
</svelte:head>

<div class="container mx-auto p-4 space-y-8 max-w-4xl">
	<h2 class="text-3xl font-bold text-white mb-8">Create New Billing Cycle</h2>

	<form on:submit|preventDefault={createBillingCycle} class="space-y-6">
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

		<Button type="submit" variant="primary">Create</Button>
	</form>

	<Button href="/projects/ccbilling" variant="secondary">Back to Billing Cycles</Button>
</div>
