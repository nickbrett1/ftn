<script>
	import { page } from '$app/stores';
	$: cycleId = $page.params.id;
</script>

<h3>Upload Statement PDF for Billing Cycle: {cycleId}</h3>

<!-- Placeholder: Drag-and-drop area for PDF upload (to be implemented) -->
<div style="border: 2px dashed #ccc; padding: 2em; margin: 1em 0; text-align: center;">
	Drag and drop PDF here (to be implemented)
</div>

<a href="/projects/ccbilling/{cycleId}">Back to Billing Cycle</a>
