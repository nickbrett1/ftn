<script>
	// Placeholder: Logic for creating a new billing cycle (to be implemented)
	let startDate = '';
	let endDate = '';

	function createBillingCycle() {
		// To be implemented: Call backend to create billing cycle
		alert(`Create billing cycle: ${startDate} to ${endDate}`);
	}
</script>

<h2>Create New Billing Cycle</h2>

<form on:submit|preventDefault={createBillingCycle}>
	<label>
		Start Date:
		<input type="date" bind:value={startDate} required />
	</label>
	<br />
	<label>
		End Date:
		<input type="date" bind:value={endDate} required />
	</label>
	<br />
	<button type="submit">Create</button>
</form>

<a href="/projects/ccbilling">Back to Billing Cycles</a>
