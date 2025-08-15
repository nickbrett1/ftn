<script>
	import { onMount, onDestroy } from 'svelte';
	import { Canvas, T } from '@threlte/core';
	import { useProgress, OrbitControls } from '@threlte/extras';
	import { tweened } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import HeatmapScene from './HeatmapScene.svelte';
	import HeatmapLegend from './HeatmapLegend.svelte';
	import { generateSP500HeatmapData } from '$lib/utils/sp500HeatmapData';
	import { browser } from '$app/environment';

	const { progress } = useProgress();
	const tweenedProgress = tweened(0);
	
	let sp500Data = $state([]);
	let hasError = $state(false);
	let errorMessage = $state('');
	let isClient = $state(false);
	let isLoaded = $state(false);
	
	// Create a reactive statement to watch data changes
	$effect(() => {
		console.log('Heatmap3D: Data state changed:', sp500Data);
		console.log('Heatmap3D: Data length:', sp500Data?.length);
	});

	onMount(() => {
		isClient = true;
		
		// Generate data
		try {
			sp500Data = generateSP500HeatmapData();
			console.log('Heatmap3D: Generated data:', sp500Data);
			console.log('Heatmap3D: Data length:', sp500Data?.length);
			console.log('Heatmap3D: Sample data:', sp500Data?.[0]);
		} catch (error) {
			console.error('Heatmap3D: Error generating data:', error);
			hasError = true;
			errorMessage = 'Failed to generate heatmap data';
			return;
		}
		
		// Validate data
		if (!sp500Data || !Array.isArray(sp500Data) || sp500Data.length === 0) {
			hasError = true;
			errorMessage = 'Failed to generate heatmap data';
			console.error('Heatmap3D: Data validation failed');
		} else {
			// Additional data validation
			const validData = sp500Data.filter(item => 
				item && 
				item.ticker && 
				item.sector && 
				typeof item.marketCap === 'number' && 
				typeof item.priceChange === 'number'
			);
			
			if (validData.length !== sp500Data.length) {
				console.warn('Heatmap3D: Some data items are invalid:', {
					total: sp500Data.length,
					valid: validData.length,
					invalid: sp500Data.length - validData.length
				});
			}
			
			console.log('Heatmap3D: Valid data count:', validData.length);
			console.log('Heatmap3D: Data state updated, length:', sp500Data.length);
		}

		// Update tweened progress when progress changes (client-side only)
		const unsubscribe = progress.subscribe((value) => {
			console.log('Heatmap3D: Progress update:', value);
			tweenedProgress.set(value);
			
			// If progress reaches 1, mark as loaded
			if (value >= 1) {
				isLoaded = true;
			}
		});

		// Fallback: if progress doesn't update within 5 seconds, force completion
		const fallbackTimer = setTimeout(() => {
			if (!$tweenedProgress || $tweenedProgress < 0.9) {
				console.log('Heatmap3D: Using fallback progress completion');
				tweenedProgress.set(1);
				isLoaded = true;
			}
		}, 5000);

		return () => {
			unsubscribe();
			clearTimeout(fallbackTimer);
		};
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
		<div
			class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10"
		>
			<div class="text-center">
				<div
					class="w-16 h-16 border-4 border-red-400 border-t-transparent rounded-full mx-auto mb-4"
				></div>
				<p class="text-lg text-white mb-2">Error Loading 3D Heatmap</p>
				<p class="text-sm text-red-400">{errorMessage}</p>
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
		<!-- Canvas container with fallback -->
		<div class="w-full h-full relative">
			<Canvas
				gl={{ antialias: true, alpha: false }}
				onError={(error) => {
					console.error('Heatmap3D: Canvas error:', error);
					hasError = true;
					errorMessage = `Canvas error: ${error.message}`;
				}}
				oncreate={() => {
					console.log('Heatmap3D: Canvas created successfully');
				}}
				onload={() => {
					console.log('Heatmap3D: Canvas loaded successfully');
				}}
				class="w-full h-full"
			>
			<!-- Background color -->
			<T.Color attach="background" args={['#000000']} />
			
			<!-- Basic lighting for test cube -->
			<T.AmbientLight intensity={0.8} />
			<T.DirectionalLight position={[10, 10, 5]} intensity={1} />
			
			<!-- Camera controls -->
			<T.PerspectiveCamera
				position={[0, 20, 40]}
				fov={60}
				makeDefault
			/>
			<OrbitControls
				enableDamping
				dampingFactor={0.05}
				enablePan={true}
				enableZoom={true}
				enableRotate={true}
				autoRotate={true}
				autoRotateSpeed={0.5}
			/>
			
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
				<T.Mesh position={[0, 15, 0]}>
					<T.BoxGeometry args={[2, 2, 2]} />
					<T.MeshStandardMaterial
						color="#00ff00"
						emissive="#00ff00"
						emissiveIntensity={1.0}
					/>
				</T.Mesh>
			{/if}
			</Canvas>
			
			<!-- Fallback text if Canvas fails -->
			<div class="absolute inset-0 flex items-center justify-center text-white text-lg bg-black bg-opacity-50" style="display: none;">
				Canvas failed to load
			</div>
		</div>

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
	{/if}
</div>
