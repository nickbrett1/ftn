<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import Button from '$lib/components/Button.svelte';

	export let data;
	$: ({ billingCycles } = data);

	function formatLocalDate(dateString) {
		if (!dateString) return '';
		const [year, month, day] = dateString.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

<PageLayout
	title="Credit Card Billing Tool"
	description="Track and categorize credit card statements"
>
	<h1 class="text-4xl font-bold mb-8">Credit Card Billing Tool</h1>

	<!-- Billing cycles list -->
	{#if billingCycles.length === 0}
		<div class="text-center py-8">
			<p class="text-gray-300 mb-4">No billing cycles yet.</p>
			<p class="text-gray-400 text-sm">Create your first billing cycle to get started.</p>
		</div>
	{:else}
		<div class="space-y-4 mb-8">
			<h2 class="text-2xl font-semibold text-white">Billing Cycles</h2>
			<div class="grid gap-4">
				{#each billingCycles as cycle (cycle.id)}
					<div
						class="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
					>
						<a href={`/projects/ccbilling/${cycle.id}`} class="block">
							<div class="flex justify-between items-center">
								<div>
									<h3 class="text-lg font-medium text-white">
										{formatLocalDate(cycle.start_date)} - {formatLocalDate(cycle.end_date)}
									</h3>
									<p class="text-gray-400 text-sm">
										Status: {cycle.closed ? 'Closed' : 'Open'}
									</p>
								</div>
								<div class="text-gray-400">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7"
										></path>
									</svg>
								</div>
							</div>
						</a>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="flex space-x-4">
		<Button href="/projects/ccbilling/new" variant="success" size="lg"
			>Create New Billing Cycle</Button
		>
		<Button href="/projects/ccbilling/cards" variant="secondary" size="lg"
			>Manage Credit Cards</Button
		>
	</div>
</PageLayout>
