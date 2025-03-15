<script>
	let { children, isActive = false, href = '' } = $props();
</script>

<li>
	<a
		{href}
		class={'relative block px-3 py-2.5 transition duration-400 ' +
			(isActive ? 'text-green-400' : 'hover:text-green-400')}
	>
		{@render children()}
	</a>
</li>
