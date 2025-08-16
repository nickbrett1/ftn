<script>
	import DesktopNavigationItem from './DesktopNavigationItem.svelte';

	let { class: classes, active, items } = $props();
</script>

<nav class={classes}>
	<ul
		class="flex
			rounded-full
			text-white
			px-3
			backdrop-blur
			border
			border-transparent
			[background:linear-gradient(45deg,#172033,theme(colors.black)_50%,#172033)_padding-box,conic-gradient(from_var(--border-angle),theme(colors.black)_10%,_theme(colors.green.600)_40%,_theme(colors.green.500)_70%,_theme(colors.green.700)_95%,_theme(colors.black))_border-box]
			animate-border"
	>
		{#each items as item (item)}
			<DesktopNavigationItem href={`#${item}`} isActive={active == item}
				>{item}</DesktopNavigationItem
			>
		{/each}
	</ul>
</nav>

<style>
</style>
