<script>
	import { scrollIntoView } from '$lib/utils/utils';

	let { children, isActive = false, href = '' } = $props();
</script>

<li>
	<a
		{href}
		onclick={(e) => {
			e.preventDefault();
			scrollIntoView(e);
		}}
		class={'relative block px-3 py-2.5 transition duration-400 ' +
			(isActive ? 'text-green-400' : 'hover:text-green-400')}
	>
		{@render children()}
	</a>
</li>
