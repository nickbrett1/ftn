<script>
	import { fly, scale, slide } from 'svelte/transition';
	import { backOut, quintOut } from 'svelte/easing';
	import { onDestroy, onMount } from 'svelte';

	const lines = ['TITLE', '', 'ENGINEERING', '', 'PRODUCT', '', 'DATA', '', '?', ''];
	const questionLine = ['?', '\u2193'];
	const LINE_DELAY = 200; // Delay between each line in ms

	let animate = $state(false);
	let index = $state(0);

	let roller;

	onMount(async () => {
		animate = true;
		roller = setInterval(() => {
			if (index === questionLine.length - 1) index = 0;
			else index++;
		}, 1500);
	});

	onDestroy(() => {
		clearInterval(roller);
	});

	let hovering = $state(false);
	let x = $state(),
		y = $state();
	const mouseOver = () => (hovering = true);
	const mouseMove = (event) => {
		x = event.clientX + 5;
		y = event.clientY + 5;
	};
	const mouseLeave = () => (hovering = false);
</script>

<div class="flex justify-center items-center grow">
	<div class="text-white">
		{#each lines as line, index_ (index_)}
			{#if animate}
				<div
					class="max-w-4xl text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-10xl font-black text-center max-h-[8vh] text-nowrap"
				>
					<div class="inline-block overflow-visible relative">
						<span
							class="inline-block m-1"
							in:fly={{
								y: 100,
								delay: LINE_DELAY * index_,
								easing: backOut
							}}
						>
							{#if index_ == 0}
								DO YOU <span
									class="relative glitch bg-linear-to-r from-emerald-300 via-green-400 to-emerald-500 text-transparent bg-clip-text"
									onmouseover={mouseOver}
									onmouseleave={mouseLeave}
									onmousemove={mouseMove}
									onfocus={() => {}}
									data-text="GROK"
									role="note"
								>
									GROK
									{#if hovering}
										<div
											in:scale={{ duration: 300, easing: quintOut }}
											style="top: {y}px; left: {x}px"
											class="border-2 border-solid border-white shadow-sm
													bg-white rounded p-1 fixed text-wrap opacity-100 z-10"
										>
											<h3 class="text-base normal-case text-black font-semibold relative">
												grok<br />
												<i>transitive verb</i>
												: to understand profoundly and intuitively
											</h3>
										</div>
									{/if}
								</span>
							{:else if index_ == lines.length - 2}
								{#key index}
									<p
										style="color: {index == 0 ? 'white' : '#6ee7b7'}"
										transition:slide={{ delay: LINE_DELAY * index_ }}
									>
										{questionLine[index]}
									</p>
								{/key}
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
