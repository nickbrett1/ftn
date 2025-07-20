<script>
	import { page } from '$app/stores';
	$: cycleId = $page.params.id;
</script>

<svelte:head>
	<title>Billing Cycle {cycleId}</title>
	<meta name="description" content="Manage billing cycle details and statements" />
</svelte:head>

<div class="container mx-auto p-4 space-y-8 max-w-6xl">
	<h2 class="text-3xl font-bold text-white mb-8">Billing Cycle: {cycleId}</h2>

	<!-- Placeholder: Show billing cycle details, list of statements, and payments grid (to be implemented) -->
	<p class="text-gray-300">Billing cycle details and statements will be displayed here.</p>

	<div class="space-y-4">
		<a href="/projects/ccbilling/{cycleId}/upload" class="inline-block">
			<button class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
				Upload Statement PDF
			</button>
		</a>

		<br />

		<a href="/projects/ccbilling" class="link-yellow">Back to Billing Cycles</a>
	</div>
</div>
