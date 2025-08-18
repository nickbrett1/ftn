<script>
	import tippy from 'tippy.js';
	import 'tippy.js/dist/tippy.css';
	import { onMount } from 'svelte';

	let { data } = $props();

	let id = $props.id();

	onMount(() => {
		tippy('#' + id, {
			content: data.tooltip
		});
	});
</script>

	<button
		{id}
		class="size-full cursor-pointer"
		type="button"
		aria-label={data.tooltip}
		onclick={() => {
			window.location = data.link;
		}}
	>
	<data.Icon />
</button>
