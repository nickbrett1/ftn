<!--
	Breadcrumb.svelte
	
	Simple breadcrumb navigation component for genproj tool.
	Displays navigation path with clickable links.
	
	Props:
	- items: Array of {label, href} objects
-->

<script>
	let { items = [] } = $props();
</script>

<nav aria-label="Breadcrumb" class="flex items-center space-x-2 text-sm">
	{#each items as item, index}
		{#if index > 0}
			<span class="text-gray-400">/</span>
		{/if}
		
		{#if item.href && index < items.length - 1}
			<a 
				href={item.href} 
				class="text-blue-600 hover:text-blue-800 hover:underline"
			>
				{item.label}
			</a>
		{:else}
			<span class="text-gray-900 font-medium">{item.label}</span>
		{/if}
	{/each}
</nav>
