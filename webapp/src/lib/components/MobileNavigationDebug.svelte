<script>
	let { debugInfo = {} } = $props();
</script>

{#if Object.keys(debugInfo).length > 0}
	<div class="fixed top-20 left-4 z-50 bg-black/80 text-white p-4 rounded-lg max-w-sm text-xs font-mono">
		<div class="font-bold mb-2">Mobile Nav Debug:</div>
		{#each Object.entries(debugInfo) as [key, value]}
			<div class="mb-1">
				<span class="text-green-400">{key}:</span> 
				<span class="text-yellow-300">{value}</span>
			</div>
		{/each}
	</div>
{/if}