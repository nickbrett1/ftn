<script>
	import { scrollIntoView } from '$lib/utils/utils';

	let { current = 'home', active = 'home', hide = () => {} } = $props();
</script>

<li>
	<a
		href="#{current}"
		class="block py-2 {active == current ? 'text-green-400' : ''}"
		onclick={(e) => {
			e.preventDefault();
			scrollIntoView(e);
			hide();
		}}
	>
		{current}
	</a>
</li>
