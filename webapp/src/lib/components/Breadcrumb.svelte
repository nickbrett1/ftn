<script>
	import { goto } from '$app/navigation';
	let { items = [] } = $props();
</script>

<nav aria-label="Breadcrumb" class="flex items-center space-x-2 text-sm">
	{#each items as item, index (item.href)}
		{#if index > 0}
			<span class="text-gray-400">/</span>
		{/if}

		{#if item.href && index < items.length - 1}
			<button
				onclick={() => goto(item.href)}
				class="text-blue-600 hover:text-blue-800 hover:underline"
			>
				{item.label}
			</button>
		{:else}
			<span class="text-gray-900 font-medium">{item.label}</span>
		{/if}
	{/each}
</nav>
