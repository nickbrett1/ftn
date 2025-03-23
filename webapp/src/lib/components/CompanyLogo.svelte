<script>
	import tippy from 'tippy.js';
	import 'tippy.js/dist/tippy.css';
	import { onMount } from 'svelte';
	import { nanoid } from 'nanoid';

	let { tooltip = '', link = '', icon = null } = $props();

	let id = nanoid();

	onMount(() => {
		tippy('#' + id, {
			content: { tooltip }
		});
	});
</script>

<button
	class="size-full cursor-pointer"
	type="button"
	aria-label={tooltip}
	onclick={() => {
		window.location = link;
	}}
>
	{#if icon}
		{@render icon()}
	{/if}
</button>
