<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { T, Canvas } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import * as THREE from 'three';
	import { generateFinancialCentersData } from '$lib/utils/financialCentersData';
	import FinancialCenterMarker from './FinancialCenterMarker.svelte';
	import MarketLegend from './MarketLegend.svelte';

	let financialCentersData = $state([]);
	let isLoaded = $state(false);
	let hasError = $state(false);
	let errorMessage = $state('');
	let isClient = $state(false);
	let animationId = null;

	onMount(() => {
		try {
			isClient = true;
			financialCentersData = generateFinancialCentersData();
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
			
			{#if financialCentersData && financialCentersData.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each financialCentersData as center}
						<div class="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
							<div class="flex justify-between items-start mb-2">
								<div>
									<div class="font-bold text-white">{center.name}</div>
									<div class="text-sm text-zinc-400">{center.country}</div>
								</div>
								<div class="text-right">
									<div class="text-sm font-medium {center.marketSentiment >= 0 ? 'text-green-400' : 'text-red-400'}">
										{center.marketSentiment >= 0 ? '+' : ''}{center.marketSentiment.toFixed(1)}%
									</div>
									<div class="text-xs text-zinc-500">{center.timezone}</div>
								</div>
							</div>
							<div class="text-xs text-zinc-500">
								Markets: {center.markets.join(', ')}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center text-zinc-400">
					No financial center data available
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
				<T.Color attach="background" args={['#000011']} />
				
				<!-- Enhanced lighting for dramatic effect -->
				<T.AmbientLight intensity={0.1} color="#ffffff" />
				<T.DirectionalLight position={[50, 30, 20]} intensity={0.8} color="#ffffff" />
				<T.PointLight position={[20, 15, 10]} intensity={0.6} color="#4a90e2" distance={100} />
				<T.PointLight position={[-20, 15, -10]} intensity={0.4} color="#ffffff" distance={80} />
				
				<!-- Sun - bright glowing sphere -->
				<T.Mesh position={[100, 50, 50]}>
					<T.SphereGeometry args={[15, 32, 32]} />
					<T.MeshBasicMaterial
						color="#ffff00"
						emissive="#ffff00"
						emissiveIntensity={2.0}
					/>
				</T.Mesh>
				
				<!-- Sun glow effect -->
				<T.Mesh position={[100, 50, 50]}>
					<T.SphereGeometry args={[20, 32, 32]} />
					<T.MeshBasicMaterial
						color="#ffff00"
						transparent={true}
						opacity={0.3}
					/>
				</T.Mesh>
				
				<!-- Stars background -->
				<T.Points>
					<T.BufferGeometry>
						<T.BufferAttribute
							attach="attributes.position"
							args={[
								new Float32Array([
									// Generate random star positions in a large sphere
									...Array.from({ length: 1000 }, () => [
										(Math.random() - 0.5) * 400,
										(Math.random() - 0.5) * 400,
										(Math.random() - 0.5) * 400
									]).flat()
								]),
								3
							]}
						/>
					</T.BufferGeometry>
					<T.PointsMaterial
						color="#ffffff"
						size={2}
						sizeAttenuation={true}
						transparent={true}
						opacity={0.8}
					/>
				</T.Points>
				
				<!-- Earth with realistic appearance -->
				<T.Mesh position={[0, 0, 0]}>
					<T.SphereGeometry args={[10, 64, 64]} />
					<T.MeshStandardMaterial
						color="#4a90e2"
						emissive="#1a3a5a"
						emissiveIntensity={0.1}
						metalness={0.2}
						roughness={0.7}
						wireframe={false}
					/>
				</T.Mesh>
				
				<!-- Earth atmosphere glow -->
				<T.Mesh position={[0, 0, 0]}>
					<T.SphereGeometry args={[10.3, 32, 32]} />
					<T.MeshBasicMaterial
						color="#4a90e2"
						transparent={true}
						opacity={0.1}
					/>
				</T.Mesh>
				
				<!-- Subtle grid lines on Earth surface -->
				<T.LineSegments>
					<T.BufferGeometry>
						<T.BufferAttribute
							attach="attributes.position"
							args={[
								new Float32Array([
									// Latitude lines
									...Array.from({ length: 8 }, (_, i) => {
										const lat = (i - 4) * Math.PI / 4;
										const points = [];
										for (let j = 0; j <= 32; j++) {
											const lng = j * Math.PI / 16;
											points.push(
												10 * Math.cos(lat) * Math.cos(lng),
												10 * Math.sin(lat),
												10 * Math.cos(lat) * Math.sin(lng)
											);
										}
										return points;
									}).flat(),
									// Longitude lines
									...Array.from({ length: 16 }, (_, i) => {
										const lng = i * Math.PI / 8;
										const points = [];
										for (let j = 0; j <= 16; j++) {
											const lat = (j - 8) * Math.PI / 8;
											points.push(
												10 * Math.cos(lat) * Math.cos(lng),
												10 * Math.sin(lat),
												10 * Math.cos(lat) * Math.sin(lng)
											);
										}
										return points;
									}).flat()
								]),
								3
							]}
						/>
					</T.BufferGeometry>
					<T.LineBasicMaterial
						color="#2a5a8a"
						transparent={true}
						opacity={0.3}
						linewidth={1}
					/>
				</T.LineSegments>
				
				<!-- Financial center markers on the globe -->
				{#if financialCentersData && financialCentersData.length > 0}
					{#each financialCentersData as center, index}
						<FinancialCenterMarker {center} {index} />
					{/each}
				{/if}
				
				<!-- Camera setup -->
				<T.PerspectiveCamera
					position={[0, 15, 25]}
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
						autoRotateSpeed={0.3}
						minDistance={15}
						maxDistance={50}
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
						<span>Positive Sentiment</span>
					</div>
					<div class="flex items-center gap-2 mb-2">
						<div class="w-3 h-3 bg-red-400 rounded-full"></div>
						<span>Negative Sentiment</span>
					</div>
					<div class="text-xs text-zinc-400">
						Financial Centers: {financialCentersData?.length || 0}<br />
						Status: {isLoaded ? 'Live' : 'Loading...'}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>