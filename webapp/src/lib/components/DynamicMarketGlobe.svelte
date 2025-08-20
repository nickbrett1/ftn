<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { T, Canvas } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import * as THREE from 'three';
	import { generateMarketData } from '$lib/utils/marketDataGenerator';
	import MarketDataPoint from './MarketDataPoint.svelte';
	import MarketLegend from './MarketLegend.svelte';

	let marketData = $state([]);
	let isLoaded = $state(false);
	let hasError = $state(false);
	let errorMessage = $state('');
	let isClient = $state(false);
	let animationId = null;

	onMount(() => {
		try {
			isClient = true;
			marketData = generateMarketData();
			isLoaded = true;
			startAnimation();
		} catch (error) {
			console.error('DynamicMarketGlobe: Error during initialization:', error);
			hasError = true;
			errorMessage = `Initialization error: ${error.message}`;
		}
	});

	onDestroy(() => {
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
	});

	function startAnimation() {
		// Animation loop will be handled by Three.js
	}
</script>

<div class="relative w-full h-full">
	{#if !browser}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
				<p class="text-lg text-white mb-2">Dynamic Market Globe</p>
				<p class="text-sm text-zinc-400">This component requires a browser environment</p>
			</div>
		</div>
	{:else if !isClient}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-blue-400 border-t-transparent animate-spin mx-auto mb-4"></div>
				<p class="text-lg text-white mb-2">Initializing Market Globe</p>
				<p class="text-sm text-zinc-400">Loading client-side components...</p>
			</div>
		</div>
	{:else if hasError}
		<div class="w-full h-full bg-black p-4 overflow-auto">
			<div class="text-center text-white mb-4">
				<h2 class="text-xl font-bold mb-2">Market Data Globe</h2>
				<p class="text-sm text-zinc-400">3D rendering failed, showing 2D representation</p>
			</div>
			
			{#if marketData && marketData.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each marketData as instrument}
						<div class="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
							<div class="flex justify-between items-start mb-2">
								<div>
									<div class="font-bold text-white">{instrument.symbol}</div>
									<div class="text-sm text-zinc-400">{instrument.name}</div>
								</div>
								<div class="text-right">
									<div class="text-sm font-medium {instrument.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}">
										{instrument.priceChange >= 0 ? '+' : ''}{instrument.priceChange.toFixed(2)}%
									</div>
									<div class="text-xs text-zinc-500">${instrument.price.toFixed(2)}</div>
								</div>
							</div>
							<div class="text-xs text-zinc-500">{instrument.type}</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center text-zinc-400">
					No market data available
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
				<p class="text-lg text-white mb-2">Loading Market Globe</p>
				<p class="text-sm text-zinc-400">Preparing financial data visualization...</p>
			</div>
		</div>
	{:else}
		<div class="relative w-full h-full">
			<Canvas
				oncreated={(gl) => {
					try {
						gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
						gl.setSize(window.innerWidth, window.innerHeight);
					} catch (error) {
						console.error('DynamicMarketGlobe: Error configuring renderer:', error);
						hasError = true;
						errorMessage = `Renderer error: ${error.message}`;
					}
				}}
				onerror={(error) => {
					console.error('DynamicMarketGlobe: Canvas error:', error);
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
				
				<!-- Enhanced lighting for neon effect -->
				<T.AmbientLight intensity={0.2} color="#ffffff" />
				<T.DirectionalLight position={[10, 10, 5]} intensity={0.8} color="#00ffff" />
				<T.PointLight position={[0, 20, 0]} intensity={1.5} color="#ff00ff" distance={50} />
				<T.PointLight position={[20, 0, 20]} intensity={1.0} color="#00ff88" distance={40} />
				
				<!-- Central sphere representing the market core -->
				<T.Mesh position={[0, 0, 0]}>
					<T.SphereGeometry args={[8, 32, 32]} />
					<T.MeshStandardMaterial
						color="#1a1a1a"
						emissive="#0a0a0a"
						metalness={0.9}
						roughness={0.1}
						wireframe={true}
					/>
				</T.Mesh>
				
				<!-- Orbiting market data points -->
				{#if marketData && marketData.length > 0}
					{#each marketData as instrument, index}
						<MarketDataPoint {instrument} {index} />
					{/each}
				{/if}
				
				<!-- Camera setup -->
				<T.PerspectiveCamera
					position={[0, 25, 35]}
					fov={60}
					aspect={typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 16 / 9}
					near={0.1}
					far={1000}
					makeDefault
				>
					<OrbitControls
						enableDamping
						dampingFactor={0.05}
						enablePan={true}
						enableZoom={true}
						enableRotate={true}
						autoRotate={true}
						autoRotateSpeed={0.5}
						minDistance={20}
						maxDistance={80}
					/>
				</T.PerspectiveCamera>
			</Canvas>
			
			<!-- Legend overlay -->
			<div class="absolute top-4 right-4 z-20">
				<MarketLegend />
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
						Instruments: {marketData?.length || 0}<br />
						Status: {isLoaded ? 'Live' : 'Loading...'}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>