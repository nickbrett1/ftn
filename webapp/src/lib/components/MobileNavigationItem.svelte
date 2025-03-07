<script>
	let { current = 'home', active = 'home', hide = () => {} } = $props();
</script>

<li>
	<a
		href="/#{current}"
		class="block py-2 {active == current ? 'dark:text-accent-400' : ''}"
		onclick={hide}
	>
		{current}
	</a>
</li>
