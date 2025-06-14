<script>
	let { current = 'home', active = 'home', hide = () => {} } = $props();
</script>

<li>
	<a
		href="/#{current}"
		class="block py-2 {active == current ? 'text-green-400' : ''}"
		onclick={(e) => {
			hide();
		}}
	>
		{current}
	</a>
</li>
