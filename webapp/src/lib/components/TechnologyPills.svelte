<script>
	export let technologies = []; // e.g., ['dbt', 'DuckDB', 'Cloudflare']
</script>

{#if technologies.length > 0}
	<div class="not-prose my-4 flex flex-wrap gap-2 justify-start">
		{#each technologies as tech (tech)}
			<span class="bg-gray-600 text-gray-300 text-xs font-medium px-2.5 py-0.5 rounded-full"
				>{tech}</span
			>
		{/each}
	</div>
{/if}
