<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import Button from '$lib/components/Button.svelte';

	// Placeholder: Fetch billing cycles from backend (to be implemented)
	let billingCycles = [];
</script>

<PageLayout
	title="Credit Card Billing Tool"
	description="Track and categorize credit card statements"
>
	<h1 class="text-4xl font-bold mb-8">Credit Card Billing Tool</h1>

	<!-- Placeholder for billing cycle list -->
	{#if billingCycles.length === 0}
		<p>No billing cycles yet.</p>
	{:else}
		<ul class="space-y-2">
			{#each billingCycles as cycle}
				<li>
					<!-- Link to billing cycle details (to be implemented) -->
					<a href={`/projects/ccbilling/${cycle.id}`}>
						Billing Cycle: {cycle.start_date} - {cycle.end_date}
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	<Button href="/projects/ccbilling/new">Create New Billing Cycle</Button>
</PageLayout>
