<script>
	// Placeholder: Fetch billing cycles from backend (to be implemented)
	let billingCycles = [];
</script>

<h1>Credit Card Billing Tool</h1>

<!-- Placeholder for billing cycle list -->
{#if billingCycles.length === 0}
	<p>No billing cycles yet.</p>
{:else}
	<ul>
		{#each billingCycles as cycle}
			<li>
				<!-- Link to billing cycle details (to be implemented) -->
				<a href={`/projects/ccbilling/${cycle.id}`}
					>Billing Cycle: {cycle.start_date} - {cycle.end_date}</a
				>
			</li>
		{/each}
	</ul>
{/if}

<a href="/projects/ccbilling/new">
	<button>Create New Billing Cycle</button>
</a>
