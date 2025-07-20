<script>
	let { title, description, maxWidth = 'max-w-6xl', children } = $props();
</script>

<svelte:head>
	{#if title}
		<title>{title}</title>
	{/if}
	{#if description}
		<meta name="description" content={description} />
	{/if}
</svelte:head>

<div class="content container mx-auto p-4 space-y-8 {maxWidth}">
	{@render children?.()}
</div>
