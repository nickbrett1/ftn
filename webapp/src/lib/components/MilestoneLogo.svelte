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
	style="width: 64px; height: 64px; max-width: 64px; max-height: 64px; min-width: 64px; min-height: 64px; overflow: hidden;"
>
	<data.Icon />
</button>
