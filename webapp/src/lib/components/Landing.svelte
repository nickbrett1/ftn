<script>
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { onMount } from 'svelte';

	const lines = ['TITLE', '', 'Engineering', '', 'Product', '', 'Data', '', '?'];

	let animate = false;
	onMount(async () => {
		animate = true;
	});
</script>

<div class="flex justify-center items-center grow">
	<div class="text-white">
		{#each lines as line, i}
			{#if animate}
				<div
					class="max-w-4xl text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-10xl font-black text-center"
				>
					<div class="inline-block overflow-hidden align-bottom">
						<span
							class="inline-block m-1 uppercase drop-shadow-xl"
							in:fly={{
								y: 100,
								delay: 300 * i,
								easing: backOut
							}}
						>
							{#if i == 0}
								Do you <span
									class="bg-gradient-to-r from-orange-700 via-blue-500 to-green-400 text-transparent bg-clip-text animate-gradient"
								>
									grok
								</span>
							{:else}
								{line}
							{/if}
						</span>
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
