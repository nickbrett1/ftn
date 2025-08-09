<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import Button from '$lib/components/Button.svelte';
	const { data } = $props();
	
	// Use synchronous destructuring to get data immediately
	const { billingCycles = [], budgets = [], allocationTotals = [] } = data;

	function formatLocalDate(dateString) {
		if (!dateString) return '';
		const [year, month, day] = dateString.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
	}

	function formatCurrency(amount) {
		if (amount == null) return '';
		return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
	}

	function getTotalsForCycle(cycleId) {
		// Build a map of allocation -> total for the given cycle
		const rows = allocationTotals.filter((row) => row.cycle_id === cycleId);
		const map = new Map();
		for (const row of rows) {
			const key = row.allocated_to ?? '__unallocated__';
			map.set(key, (map.get(key) || 0) + row.total_amount);
		}
		// Ensure all budgets are present with 0 when absent
		for (const b of budgets) {
			if (!map.has(b.name)) map.set(b.name, 0);
		}
		// Always include unallocated bucket
		if (!map.has('__unallocated__')) map.set('__unallocated__', 0);

		// Sort: unallocated first, then alphabetical by budget name
		const entries = Array.from(map.entries());
		entries.sort(([a], [b]) => {
			if (a === '__unallocated__') return -1;
			if (b === '__unallocated__') return 1;
			return a.localeCompare(b);
		});
		return entries;
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
							<div class="flex justify-between items-start">
								<div>
									<h3 class="text-lg font-medium text-white">
										{formatLocalDate(cycle.start_date)} - {formatLocalDate(cycle.end_date)}
									</h3>
									<div class="mt-2 text-sm text-gray-300 space-y-1">
										{#each getTotalsForCycle(cycle.id) as [allocation, total]}
											<div class="flex justify-between gap-4">
												<span class="text-gray-400">{allocation === '__unallocated__' ? 'Unallocated' : allocation}</span>
												<span class="text-white tabular-nums">{formatCurrency(total)}</span>
											</div>
										{/each}
									</div>
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
		<Button href="/projects/ccbilling/budgets" variant="secondary" size="lg">Manage Budgets</Button>
	</div>
</PageLayout>
