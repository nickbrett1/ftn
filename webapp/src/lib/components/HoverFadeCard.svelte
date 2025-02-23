<script>
	import Card from '$lib/components/Card.svelte';
	import { fade } from 'svelte/transition';
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte').Snippet} [onHover]
	 * @property {import('svelte').Snippet} [initial]
	 */

	/** @type {Props} */
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
	>
		{#if isHovering}
			<div transition:fade={{ delay: 250, duration: 300 }} class="absolute inset-0 content-center">
				{@render onHover?.()}
			</div>
		{:else}
			<div transition:fade={{ delay: 250, duration: 300 }} class="absolute inset-0 content-center">
				{@render initial?.()}
			</div>
		{/if}
	</div>
</Card>
