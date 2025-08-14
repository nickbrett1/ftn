<script>
	import { onMount, onDestroy } from 'svelte';
	import { Canvas } from '@threlte/core';
	import { OrbitControls, useProgress } from '@threlte/extras';
	import { tweened } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { run } from 'svelte/legacy';
	import HeatmapScene from './HeatmapScene.svelte';
	import HeatmapLegend from './HeatmapLegend.svelte';
	import { generateSP500HeatmapData } from '$lib/utils/sp500HeatmapData';

	const { progress } = useProgress();
	const tweenedProgress = tweened($progress);
	
	run(() => {
		tweenedProgress.set($progress);
	});

	let sp500Data = generateSP500HeatmapData();
</script>

<div class="relative w-full h-full">
	{#if $tweenedProgress < 1}
		<div
			transition:fade
			class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10"
		>
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
				<p class="text-lg text-white mb-2">Loading 3D Heatmap</p>
				<p class="text-sm text-zinc-400">Preparing market data visualization...</p>
			</div>
			<div class="w-64 h-3 bg-zinc-800 rounded-full overflow-hidden">
				<div class="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300" 
					 style="width: {$tweenedProgress * 100}%"></div>
			</div>
		</div>
	{/if}

	<Canvas>
		<HeatmapScene {sp500Data} />
		<OrbitControls 
			enableDamping 
			dampingFactor={0.05}
			enablePan={true}
			enableZoom={true}
			enableRotate={true}
			autoRotate={true}
			autoRotateSpeed={0.5}
		/>
	</Canvas>

	<!-- Legend overlay -->
	<div class="absolute top-4 right-4 z-20">
		<HeatmapLegend />
	</div>

	<!-- Data info overlay -->
	<div class="absolute bottom-4 left-4 z-20 bg-black bg-opacity-80 rounded-lg p-4 border border-zinc-700">
		<div class="text-white text-sm">
			<div class="flex items-center gap-2 mb-2">
				<span class="w-3 h-3 bg-green-400 rounded-full"></span>
				<span>Positive Change</span>
			</div>
			<div class="flex items-center gap-2 mb-2">
				<span class="w-3 h-3 bg-red-400 rounded-full"></span>
				<span>Negative Change</span>
			</div>
			<div class="text-xs text-zinc-400">
				Column height = % change<br>
				Column area = Market cap<br>
				Grouped by sector
			</div>
		</div>
	</div>
</div>