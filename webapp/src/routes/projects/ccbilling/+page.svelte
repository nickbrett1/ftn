<script>
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Button from '$lib/components/Button.svelte';
	const { data } = $props();

	// Use synchronous destructuring to get data immediately
	const { billingCycles = [], budgets = [], allocationTotals = [] } = data;

	import { formatDate } from '$lib/utils/date-utils.js';

	function formatCurrency(amount) {
		if (amount == undefined) return '';
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
	}

	// Build a lookup for budget icons by name for quick access during render
	const budgetNameToIcon = new Map(budgets.map((b) => [b.name, b.icon]));

	function getTotalsForCycle(cycleId) {
		// Build a map of allocation -> total for the given cycle
		const rows = allocationTotals.filter((row) => row.cycle_id === cycleId);
		const map = new Map();
		for (const row of rows) {
			const key = row.allocated_to ?? '__unallocated__';
			map.set(key, (map.get(key) || 0) + row.total_amount);
		}

		// Remove entries that total exactly to zero
		for (const [key, total] of map.entries()) {
			if (total === 0) {
				map.delete(key);
			}
		}

		// Sort: unallocated first, then alphabetical by budget name
		const entries = [...map.entries()];
		entries.sort(([a], [b]) => {
			if (a === '__unallocated__') return -1;
			if (b === '__unallocated__') return 1;
			return a.localeCompare(b);
		});
		return entries;
	}

	function getCycleTotalAmount(cycleId) {
		// Calculate the sum of all allocations for this cycle
		const totals = getTotalsForCycle(cycleId);
		return totals.reduce((sum, [, amount]) => sum + amount, 0);
	}
</script>

<Header />

<div class="min-h-screen bg-base-900 text-white">
	<div class="container mx-auto px-4 py-8">
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
											{formatDate(cycle.start_date, { includeTime: false })} - {formatDate(
												cycle.end_date,
												{ includeTime: false }
											)}
										</h3>
										<div class="mt-2 text-sm text-gray-300 space-y-1">
											{#each getTotalsForCycle(cycle.id) as [allocation, total]}
												<div class="flex justify-between gap-4">
													<span class="text-gray-400 flex items-center gap-2">
														{#if allocation !== '__unallocated__' && budgetNameToIcon.get(allocation)}
															<span aria-hidden="true">{budgetNameToIcon.get(allocation)}</span>
														{/if}
														<span
															>{allocation === '__unallocated__' ? 'Unallocated' : allocation}</span
														>
													</span>
													<span class="text-white tabular-nums">{formatCurrency(total)}</span>
												</div>
											{/each}
											{#if getTotalsForCycle(cycle.id).length > 0}
												<div class="flex justify-between gap-4 pt-2 mt-2 border-t border-gray-600">
													<span class="text-gray-200 font-medium">Total</span>
													<span class="text-white font-semibold tabular-nums"
														>{formatCurrency(getCycleTotalAmount(cycle.id))}</span
													>
												</div>
											{/if}
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

		<div class="flex flex-wrap gap-4">
			<Button href="/projects/ccbilling/new" variant="success" size="lg"
				>Create New Billing Cycle</Button
			>
			<Button href="/projects/ccbilling/cards" variant="secondary" size="lg"
				>Manage Credit Cards</Button
			>
			<Button href="/projects/ccbilling/budgets" variant="secondary" size="lg"
				>Manage Budgets</Button
			>
			<Button href="/projects/ccbilling/admin" variant="secondary" size="lg">Admin Tools</Button>
		</div>
	</div>
</div>

<Footer />
