<script>
	import { page } from '$app/stores';
	$: cycleId = $page.params.id;
</script>

<h2>Billing Cycle: {cycleId}</h2>

<!-- Placeholder: Show billing cycle details, list of statements, and payments grid (to be implemented) -->

<a href="/projects/ccbilling/{cycleId}/upload">Upload Statement PDF</a>
<br />
<a href="/projects/ccbilling">Back to Billing Cycles</a>
