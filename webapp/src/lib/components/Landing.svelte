<script>
	import { fly } from 'svelte/transition';
	import { scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { backOut } from 'svelte/easing';
	import { onMount } from 'svelte';

	const lines = ['TITLE', '', 'Engineering', '', 'Product', '', 'Data', '', '?'];

	let animate = false;
	onMount(async () => {
		animate = true;
	});

	let hovering = false;
	let x, y;
	const mouseOver = () => (hovering = true);
	const mouseMove = (event) => {
		x = event.offsetX + 5;
		y = event.offsetY + 5;
	};
	const mouseLeave = () => (hovering = false);
</script>

<div class="flex justify-center items-center grow">
	<div class="text-white">
		{#each lines as line, i}
			{#if animate}
				<div
					class="max-w-4xl text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-10xl font-black text-center"
				>
					<div class="inline-block overflow-visible align-bottom">
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
									class="relative glitch text-nowrap font-bold bg-gradient-to-r from-emerald-300 via-green-400 to-emerald-500 text-transparent bg-clip-text"
									on:mouseover={mouseOver}
									on:mouseleave={mouseLeave}
									on:mousemove={mouseMove}
									on:focus={() => {}}
									data-text="grok"
									role="note"
								>
									grok
									{#if hovering}
										<div
											in:scale={{ duration: 150, easing: quintOut, opacity: 0 }}
											style="top: {y}px; left: {x}px"
											class="border-2 border-solid border-white shadow-sm
													bg-white rounded p-1 fixed text-wrap z-50"
										>
											<h3 class="text-base normal-case text-black font-semibold">
												grok verb<br />
												<i>transitive verb</i>
												: to understand profoundly and intutively
												<a href="https://www.merriam-webster.com/dictionary/grok">definition</a>
											</h3>
										</div>
									{/if}
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
		display: inline-block;
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
