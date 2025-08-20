<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { T, Canvas } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import * as THREE from 'three';
	import HeatmapScene from './HeatmapScene.svelte';
	import HeatmapLegend from './HeatmapLegend.svelte';
	import { generateSP500HeatmapData } from '$lib/utils/sp500HeatmapData';
	import { tweened } from 'svelte/motion';
	import { fade } from 'svelte/transition';

	const { progress } = useProgress();
	const tweenedProgress = tweened(0);
	
	let sp500Data = $state([]);
	let isLoaded = $state(false);
	let hasError = $state(false);
	let errorMessage = $state('');
	let isClient = $state(false);
	
	// Create a reactive statement to watch data changes
	$effect(() => {
		console.log('Heatmap3D: Data state changed:', sp500Data);
		console.log('Heatmap3D: Data length:', sp500Data?.length);
	});

	onMount(() => {
		isClient = true;
		
		try {
			// Check browser compatibility
			if (typeof window !== 'undefined') {
				// Check WebGL support
				const canvas = document.createElement('canvas');
				const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
				if (!gl) {
					console.error('Heatmap3D: WebGL not supported');
					hasError = true;
					errorMessage = 'WebGL is not supported in this browser';
					return;
				}
				
				// Check for common WebGL issues
				const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
				if (debugInfo) {
					const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
					console.log('Heatmap3D: WebGL renderer:', renderer);
				}
				
				// Check for matrix-related extensions
				const matrixExtensions = [
					'OES_matrix_palette',
					'OES_vertex_array_object',
					'WEBGL_compressed_texture_s3tc'
				];
				
				matrixExtensions.forEach(ext => {
					if (gl.getExtension(ext)) {
						console.log('Heatmap3D: Matrix extension available:', ext);
					}
				});
			}
			
			// Generate data
			sp500Data = generateSP500HeatmapData();
			console.log('Heatmap3D: Generated data:', sp500Data);
			console.log('Heatmap3D: Data length:', sp500Data?.length);
			console.log('Heatmap3D: Sample data:', sp500Data?.[0]);
			
			// Validate data structure
			if (!sp500Data || !Array.isArray(sp500Data)) {
				throw new Error('Failed to generate valid data structure');
			}
			
			// Check for invalid data items
			const invalidItems = sp500Data.filter(item => 
				!item || !item.ticker || !item.sector || 
				typeof item.marketCap !== 'number' || 
				typeof item.priceChange !== 'number'
			);
			
			if (invalidItems.length > 0) {
				console.warn('Heatmap3D: Some data items are invalid:', invalidItems);
				// Filter out invalid items
				sp500Data = sp500Data.filter(item => 
					item && item.ticker && item.sector && 
					typeof item.marketCap === 'number' && 
					typeof item.priceChange === 'number'
				);
			}
			
			console.log('Heatmap3D: Valid data count:', sp500Data.length);
			console.log('Heatmap3D: Data state updated, length:', sp500Data.length);
			
			// Update progress
			$tweenedProgress.set(1);
			isLoaded = true;
			
		} catch (error) {
			console.error('Heatmap3D: Error during initialization:', error);
			hasError = true;
			errorMessage = `Initialization error: ${error.message}`;
			
			// Try to use fallback data
			try {
				sp500Data = [
					{
						ticker: 'AAPL',
						name: 'Apple Inc.',
						sector: 'Technology',
						marketCap: 500,
						priceChange: 5.2
					},
					{
						ticker: 'MSFT',
						name: 'Microsoft Corporation',
						sector: 'Technology',
						marketCap: 450,
						priceChange: -3.1
					}
				];
				console.log('Heatmap3D: Using fallback data');
				isLoaded = true;
			} catch (fallbackError) {
				console.error('Heatmap3D: Fallback data also failed:', fallbackError);
			}
		}
	});
</script>

<div class="relative w-full h-full">
	{#if !browser}
		<div
			class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10"
		>
			<div class="text-center">
				<div
					class="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"
				></div>
				<p class="text-lg text-white mb-2">3D Heatmap</p>
				<p class="text-sm text-zinc-400">This component requires a browser environment</p>
			</div>
		</div>
	{:else if !isClient}
		<div
			class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10"
		>
			<div class="text-center">
				<div
					class="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"
				></div>
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
							<!-- Visual bar representation -->
							<div class="mt-2">
								<div class="w-full bg-zinc-700 rounded-full h-2">
									<div 
										class="h-2 rounded-full {security.priceChange >= 0 ? 'bg-green-500' : 'bg-red-500'}"
										style="width: {Math.min(Math.abs(security.priceChange) * 5, 100)}%"
									></div>
								</div>
							</div>
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
	{:else if !isLoaded && $tweenedProgress < 1}
		<div
			transition:fade
			class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10"
		>
			<div class="text-center">
				<div
					class="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"
				></div>
				<p class="text-lg text-white mb-2">Loading 3D Heatmap</p>
				<p class="text-sm text-zinc-400">Preparing market data visualization...</p>
			</div>
			<div class="w-64 h-3 bg-zinc-800 rounded-full overflow-hidden">
				<div
					class="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300"
					style="width: {$tweenedProgress * 100}%"
				></div>
			</div>
		</div>
	{/if}

	{#if !hasError && isClient && browser}
		<!-- Canvas for 3D rendering -->
		<div class="relative w-full h-full">
			{#if !hasError}
				<Canvas
					oncreated={(gl) => {
						try {
							console.log('Heatmap3D: Canvas created successfully');
							// Set renderer properties for better performance
							gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
							gl.setSize(window.innerWidth, window.innerHeight);
							gl.shadowMap.enabled = true;
							gl.shadowMap.type = THREE.PCFSoftShadowMap;
							gl.outputColorSpace = THREE.SRGBColorSpace;
							gl.toneMapping = THREE.ACESFilmicToneMapping;
							gl.toneMappingExposure = 1.2;
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
					onload={() => {
						console.log('Heatmap3D: Canvas loaded successfully');
					}}
					shadows
					gl={{ 
						antialias: true,
						alpha: false,
						powerPreference: 'high-performance'
					}}
				>
					<!-- Background color -->
					<T.Color attach="background" args={['#000000']} />
					
					<!-- Basic lighting for test cube -->
					<T.AmbientLight intensity={0.8} />
					<T.DirectionalLight position={[10, 10, 5]} intensity={1} />
					
					<!-- Simple test to verify Canvas is working -->
					<T.Mesh position={[0, 0, 0]}>
						<T.BoxGeometry args={[5, 5, 5]} />
						<T.MeshStandardMaterial
							color="#ff0000"
							emissive="#ff0000"
							emissiveIntensity={1.0}
						/>
					</T.Mesh>
					
					<!-- Additional test objects to verify 3D rendering -->
					<T.Mesh position={[10, 0, 0]}>
						<T.SphereGeometry args={[2]} />
						<T.MeshStandardMaterial
							color="#0000ff"
							emissive="#0000ff"
							emissiveIntensity={0.8}
						/>
					</T.Mesh>
					
					<T.Mesh position={[-10, 0, 0]}>
						<T.ConeGeometry args={[2, 4]} />
						<T.MeshStandardMaterial
							color="#00ffff"
							emissive="#00ffff"
							emissiveIntensity={0.8}
						/>
					</T.Mesh>
					
					<!-- Test with simple position arrays to verify matrix operations -->
					<T.Mesh position={[0, 15, 0]}>
						<T.BoxGeometry args={[2, 2, 2]} />
						<T.MeshStandardMaterial
							color="#00ff00"
							emissive="#00ff00"
							emissiveIntensity={1.0}
						/>
					</T.Mesh>
					
					<!-- Test with explicit position values -->
					<T.Mesh position={[5, 10, 5]}>
						<T.CylinderGeometry args={[1, 1, 3]} />
						<T.MeshStandardMaterial
							color="#ffff00"
							emissive="#ffff00"
							emissiveIntensity={0.8}
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
					{:else}
						<!-- Debug: Show when no data -->
						<T.Mesh position={[0, 20, 0]}>
							<T.BoxGeometry args={[2, 2, 2]} />
							<T.MeshStandardMaterial
								color="#00ff00"
								emissive="#00ff00"
								emissiveIntensity={1.0}
							/>
						</T.Mesh>
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
			
			<!-- Fallback text if Canvas fails -->
			<div class="absolute inset-0 flex items-center justify-center text-white text-lg bg-black bg-opacity-50" style="display: none;">
				Canvas failed to load
			</div>
		</div>
	{/if}

		<!-- Legend overlay -->
		<div class="absolute top-4 right-4 z-20">
			<HeatmapLegend />
		</div>

		<!-- Data info overlay -->
		<div
			class="absolute bottom-4 left-4 z-20 bg-black bg-opacity-80 rounded-lg p-4 border border-zinc-700"
		>
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
					Column height = % change<br />
					Column area = Market cap<br />
					Grouped by sector
				</div>
				<!-- Debug info -->
				<div class="text-xs text-yellow-400 mt-2 border-t border-zinc-600 pt-2">
					Data: {sp500Data?.length || 0} companies<br />
					Status: {isLoaded ? 'Loaded' : 'Loading...'}<br />
					Client: {isClient ? 'Yes' : 'No'}<br />
					Browser: {browser ? 'Yes' : 'No'}<br />
					Data Type: {typeof sp500Data}<br />
					Is Array: {Array.isArray(sp500Data) ? 'Yes' : 'No'}
				</div>
			</div>
		</div>
</div>
