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
									class="glitch relative font-bold bg-gradient-to-r from-emerald-300 via-green-400 to-emerald-500 text-transparent bg-clip-text"
									data-text="grok"
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
	.glitch:before,
	.glitch:after {
		display: block;
		content: attr(data-text);
		position: absolute;
		top: 0;
		left: 0;
		opacity: 0.8;
	}

	.glitch:before {
		animation: glitch-it 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite;
		color: #ff0061;
		z-index: -1;
	}

	.glitch:after {
		animation: glitch-it 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) reverse both infinite;
		color: #ff0061;
		z-index: -2;
	}

	@keyframes glitch-it {
		0% {
			transform: translate(0);
		}
		20% {
			transform: translate(-2px, 2px);
		}
		40% {
			transform: translate(-2px, -2px);
		}
		60% {
			transform: translate(2px, 2px);
		}
		80% {
			transform: translate(2px, -2px);
		}
		to {
			transform: translate(0);
		}
	}
</style>
