<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { T, Canvas } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import * as THREE from 'three';
	import HeatmapScene from './HeatmapScene.svelte';
	import HeatmapLegend from './HeatmapLegend.svelte';
	import { generateSP500HeatmapData } from '$lib/utils/sp500HeatmapData';

	let sp500Data = $state([]);
	let isLoaded = $state(false);
	let hasError = $state(false);
	let errorMessage = $state('');
	let isClient = $state(false);

	onMount(() => {
		try {
			isClient = true;
			
			// Generate data
			sp500Data = generateSP500HeatmapData();
			console.log('Heatmap3D: Generated data:', sp500Data);
			isLoaded = true;
		} catch (error) {
			console.error('Heatmap3D: Error during initialization:', error);
			hasError = true;
			errorMessage = `Initialization error: ${error.message}`;
		}
	});
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
				<div class="w-16 h-16 border-4 border-blue-400 border-t-transparent animate-spin mx-auto mb-4"></div>
				<p class="text-lg text-white mb-2">Initializing 3D Heatmap</p>
				<p class="text-sm text-zinc-400">Loading client-side components...</p>
			</div>
		</div>
	{:else if hasError}
		<!-- 2D Fallback Heatmap when 3D fails -->
		<div class="w-full h-full bg-black p-4 overflow-auto">
			<div class="text-center text-white mb-4">
				<h2 class="text-xl font-bold mb-2">2D Fallback Heatmap</h2>
				<p class="text-sm text-zinc-400">3D rendering failed, showing 2D representation</p>
			</div>
			
			{#if sp500Data && sp500Data.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each sp500Data as security}
						<div class="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
							<div class="flex justify-between items-start mb-2">
								<div>
									<div class="font-bold text-white">{security.ticker}</div>
									<div class="text-sm text-zinc-400">{security.name}</div>
								</div>
								<div class="text-right">
									<div class="text-sm font-medium {security.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}">
										{security.priceChange >= 0 ? '+' : ''}{security.priceChange.toFixed(2)}%
									</div>
									<div class="text-xs text-zinc-500">${(security.marketCap / 1000000000).toFixed(1)}B</div>
								</div>
							</div>
							<div class="text-xs text-zinc-500">{security.sector}</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center text-zinc-400">
					No data available for heatmap
				</div>
			{/if}
			
			<div class="text-center mt-6">
				<button 
					class="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
					onclick={() => {
						hasError = false;
						errorMessage = '';
					}}
				>
					Try 3D Again
				</button>
			</div>
		</div>
	{:else if !isLoaded}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-green-400 border-t-transparent animate-spin mx-auto mb-4"></div>
				<p class="text-lg text-white mb-2">Loading 3D Heatmap</p>
				<p class="text-sm text-zinc-400">Preparing market data visualization...</p>
			</div>
		</div>
	{:else}
		<!-- Canvas for 3D rendering -->
		<div class="relative w-full h-full">
			{#if !hasError}
				<Canvas
					oncreated={(gl) => {
						try {
							console.log('Heatmap3D: Canvas created successfully');
							gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
							gl.setSize(window.innerWidth, window.innerHeight);
						} catch (error) {
							console.error('Heatmap3D: Error configuring renderer:', error);
							hasError = true;
							errorMessage = `Renderer error: ${error.message}`;
						}
					}}
					onerror={(error) => {
						console.error('Heatmap3D: Canvas error:', error);
						hasError = true;
						errorMessage = `Canvas error: ${error.message || 'Unknown error'}`;
					}}
					gl={{ 
						antialias: true,
						alpha: false
					}}
				>
					<!-- Background color -->
					<T.Color attach="background" args={['#000000']} />
					
					<!-- Basic lighting -->
					<T.AmbientLight intensity={0.8} />
					<T.DirectionalLight position={[10, 10, 5]} intensity={1} />
					
					<!-- Simple test cube -->
					<T.Mesh position={[0, 0, 0]}>
						<T.BoxGeometry args={[5, 5, 5]} />
						<T.MeshStandardMaterial
							color="#ff0000"
							emissive="#ff0000"
							emissiveIntensity={1.0}
						/>
					</T.Mesh>
					
					{#if sp500Data && sp500Data.length > 0}
						<HeatmapScene
							{sp500Data}
							on:sceneReady={() => {
								console.log('Heatmap3D: Scene ready event received');
							}}
							on:error={(event) => {
								console.error('Heatmap3D: Scene error:', event.detail);
								hasError = true;
								errorMessage = `Scene error: ${event.detail}`;
							}}
						/>
					{/if}
				</Canvas>
			{:else}
				<!-- Error fallback -->
				<div class="absolute inset-0 flex items-center justify-center text-white text-lg bg-black bg-opacity-50">
					<div class="text-center">
						<div class="text-red-400 text-2xl mb-2">⚠️</div>
						<div class="mb-2">3D Rendering Failed</div>
						<div class="text-sm text-zinc-400">{errorMessage}</div>
						<button 
							class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
							onclick={() => {
								hasError = false;
								errorMessage = '';
							}}
						>
							Retry
						</button>
					</div>
				</div>
			{/if}
			
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
						Data: {sp500Data?.length || 0} companies<br />
						Status: {isLoaded ? 'Loaded' : 'Loading...'}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
