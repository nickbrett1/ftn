<script>
	import NavigationItem from './NavigationItem.svelte';

	let { class: classes, active, items } = $props();
</script>

<nav class={classes}>
	<ul
		class="flex rounded-full bg-white/90 px-3 text-sm font-medium text-base-800 shadow-lg shadow-base-800/5 ring-1 ring-base-900/5 backdrop-blur dark:bg-white/5 dark:text-base-200 dark:ring-white/10"
	>
		{#each items as item}
			<NavigationItem href={`/#${item}`} isActive={active == item}>{item}</NavigationItem>
		{/each}
	</ul>
</nav>
