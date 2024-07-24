<script>
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { onMount } from 'svelte';

	const lines = ['Engineering', '', 'Product', '', 'Data'];

	let animate = false;
	onMount(async () => {
		animate = true;
	});
</script>

<div class="flex h-screen">
	<div class="text-white m-auto">
		{#each lines as line, i}
			{#if animate}
				<div class="max-w-4xl text-5xl font-black text-center">
					<div class="inline-block overflow-hidden align-bottom">
						<span
							class="inline-block m-1 uppercase drop-shadow-xl"
							in:fly={{
								y: 100,
								delay: 300 * i,
								easing: backOut
							}}
						>
							{line}
						</span>
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
