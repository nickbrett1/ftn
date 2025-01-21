<script>
	import Card from '$lib/components/Card.svelte';
	import { fade } from 'svelte/transition';

	let isHovering = false;
</script>

<Card on:click>
	<div
		on:mouseenter={() => {
			isHovering = true;
		}}
		on:mouseleave={() => {
			isHovering = false;
		}}
		role="note"
	>
		{#if isHovering}
			<div transition:fade={{ delay: 250, duration: 300 }} class="absolute inset-0 content-center">
				<slot name="onHover" />
			</div>
		{:else}
			<div transition:fade={{ delay: 250, duration: 300 }} class="absolute inset-0 content-center">
				<slot name="initial" />
			</div>
		{/if}
	</div>
</Card>
