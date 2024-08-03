<script>
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	const lines = ['TITLE', '', 'Engineering', '', 'Product', '', 'Data', '', '?'];

	let animate = false;
	onMount(async () => {
		animate = true;
	});

	const range = 64;

	function handleMousemove(event) {
		const x = Math.round((event.pageX * range) / window.innerWidth) - range / 2;
		const y = Math.round((event.pageY * range) / window.innerHeight) - range / 2;
		gsap.to(document.getElementById('grok'), {
			'--x': x,
			'--y': y
		});
	}
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
									role="button"
									tabindex={0}
									on:mousemove={handleMousemove}
									id="grok"
									class="bg-gradient-to-r from-emerald-100 via-green-400 to-emerald-500 text-transparent bg-clip-text animate-gradient"
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

<style>
	:root {
		--x: -8px;
		--y: -8px;
	}

	#grok {
		color: #fff;
		font-weight: 800;
		text-shadow:
			calc(var(--x) * -1) calc(var(--y) * -1) 0px #10b981,
			calc(var(--x) * -2) calc(var(--y) * -2) 0px #4ade80,
			calc(var(--x) * -3) calc(var(--y) * -3) 0px #d1fae5;
	}
</style>
