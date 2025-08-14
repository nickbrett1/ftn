<script>
	import { onMount, onDestroy } from 'svelte';
	import { Canvas } from '@threlte/core';
	import { T } from '@threlte/core';
	import { useProgress } from '@threlte/extras';
	import { tweened } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import HeatmapScene from './HeatmapScene.svelte';
	import HeatmapLegend from './HeatmapLegend.svelte';
	import { generateSP500HeatmapData } from '$lib/utils/sp500HeatmapData';
	import { browser } from '$app/environment';

	const { progress } = useProgress();
	const tweenedProgress = tweened($progress);
	
	let sp500Data = generateSP500HeatmapData();
	let hasError = false;
	let errorMessage = '';
	let isClient = false;
	let canvasMounted = false;

	onMount(() => {
		isClient = true;
		console.log('Heatmap3D: Component mounted');
		console.log('Heatmap3D: Generated data:', sp500Data);
		console.log('Heatmap3D: Data length:', sp500Data?.length);
		
		// Validate data
		if (!sp500Data || !Array.isArray(sp500Data) || sp500Data.length === 0) {
			hasError = true;
			errorMessage = 'Failed to generate heatmap data';
			console.error('Heatmap3D: Data validation failed');
		}

		// Update tweened progress when progress changes (client-side only)
		const unsubscribe = progress.subscribe((value) => {
			tweenedProgress.set(value);
		});

		return unsubscribe;
	});

	function handleCanvasMount() {
		console.log('Heatmap3D: Canvas mounted');
		canvasMounted = true;
	}

	function handleCanvasError(error) {
		console.error('Heatmap3D: Canvas error:', error);
		hasError = true;
		errorMessage = 'Failed to initialize 3D canvas';
	}
</script>

<div class="relative w-full h-full">
	{#if !browser}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
				<p class="text-lg text-white mb-2">3D Heatmap</p>
				<p class="text-sm text-zinc-400">This component requires a browser environment</p>
			</div>
		</div>
	{:else if !isClient}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
				<p class="text-lg text-white mb-2">Initializing 3D Heatmap</p>
				<p class="text-sm text-zinc-400">Loading client-side components...</p>
			</div>
		</div>
	{:else if hasError}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-red-400 border-t-transparent rounded-full mx-auto mb-4"></div>
				<p class="text-lg text-white mb-2">Error Loading 3D Heatmap</p>
				<p class="text-sm text-red-400">{errorMessage}</p>
				<button 
					onclick={() => window.location.reload()} 
					class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
				>
					Reload Page
				</button>
			</div>
		</div>
	{:else if $tweenedProgress < 1}
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

	{#if !hasError && isClient && browser}
		<div class="w-full h-full bg-red-500">
			<Canvas 
				on:mount={handleCanvasMount} 
				on:error={handleCanvasError}
				style="width: 100%; height: 100%; background: blue;"
			>
				<!-- Test with a simple cube first -->
				<T.PerspectiveCamera position={[0, 0, 5]} makeDefault />
				<T.AmbientLight intensity={0.5} />
				<T.Mesh position={[0, 0, 0]}>
					<T.BoxGeometry args={[1, 1, 1]} />
					<T.MeshStandardMaterial color="red" />
				</T.Mesh>
				
				<!-- Original scene -->
				<HeatmapScene {sp500Data} />
			</Canvas>
		</div>

		<!-- Debug info -->
		<div class="absolute top-4 left-4 z-20 bg-black bg-opacity-80 rounded-lg p-4 border border-zinc-700">
			<div class="text-white text-sm">
				<div>Canvas mounted: {canvasMounted}</div>
				<div>Data length: {sp500Data?.length || 0}</div>
				<div>Progress: {($tweenedProgress * 100).toFixed(1)}%</div>
				<div>Browser: {browser}</div>
				<div>Client: {isClient}</div>
				<div>Error: {hasError}</div>
			</div>
		</div>

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
					<div class="w-3 h-3 bg-red-400 rounded-full"></div>
					<span>Negative Change</span>
				</div>
				<div class="text-xs text-zinc-400">
					Column height = % change<br>
					Column area = Market cap<br>
					Grouped by sector
				</div>
			</div>
		</div>
	{/if}
</div>