<script>
	import { page } from '$app/stores';
	$: cycleId = $page.params.id;
</script>

<svelte:head>
	<title>Upload Statement PDF</title>
	<meta name="description" content="Upload credit card statement PDF for processing" />
</svelte:head>

<div class="container mx-auto p-4 space-y-8 max-w-4xl">
	<h3 class="text-2xl font-bold text-white mb-8">
		Upload Statement PDF for Billing Cycle: {cycleId}
	</h3>

	<!-- Placeholder: Drag-and-drop area for PDF upload (to be implemented) -->
	<div class="border-2 border-dashed border-gray-600 p-8 text-center rounded-lg bg-gray-800">
		<p class="text-gray-300">Drag and drop PDF here (to be implemented)</p>
	</div>

	<a href="/projects/ccbilling/{cycleId}" class="link-yellow">Back to Billing Cycle</a>
</div>
