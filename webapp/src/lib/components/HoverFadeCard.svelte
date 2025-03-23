<script>
	import Card from '$lib/components/Card.svelte';
	import { fade } from 'svelte/transition';

	let { onHover, initial, onclick } = $props();

	let isHovering = $state(false);
</script>

<Card {onclick}>
	<div
		onmouseenter={() => {
			isHovering = true;
		}}
		onmouseleave={() => {
			isHovering = false;
		}}
		role="note"
		class="grid grid-cols-[1fr] grow"
	>
		<!-- Makes me cry, but missing functionality: https://github.com/sveltejs/svelte/issues/6336 -->
		{#if isHovering}
			<div
				transition:fade={{ delay: 250, duration: 300 }}
				class="row-start-1 col-start-1 grow flex"
			>
				{@render onHover?.()}
			</div>

			<div class="row-start-1 col-start-1 grow flex invisible">
				{@render initial?.()}
			</div>
		{:else}
			<div class="row-start-1 col-start-1 grow flex invisible">
				{@render onHover?.()}
			</div>

			<div
				transition:fade={{ delay: 250, duration: 300 }}
				class="row-start-1 col-start-1 grow flex"
			>
				{@render initial?.()}
			</div>
		{/if}
	</div>
</Card>
