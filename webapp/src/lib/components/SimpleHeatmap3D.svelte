<script>
	import { onMount } from 'svelte';
	import { Canvas } from '@threlte/core';
	import { T } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import { generateSP500HeatmapData } from '$lib/utils/sp500HeatmapData';
	import { browser } from '$app/environment';

	let sp500Data = [];
	let mounted = false;

	onMount(() => {
		if (browser) {
			sp500Data = generateSP500HeatmapData();
			mounted = true;
			console.log('SimpleHeatmap3D: Mounted with data:', sp500Data.length);
		}
	});
</script>

<div class="w-full h-full relative">
	{#if !browser}
		<div class="absolute inset-0 flex items-center justify-center text-white">
			Loading...
		</div>
	{:else if !mounted}
		<div class="absolute inset-0 flex items-center justify-center text-white">
			Initializing...
		</div>
	{:else}
		<Canvas style="width: 100%; height: 100%;">
			<!-- Camera -->
			<T.PerspectiveCamera position={[0, 10, 20]} makeDefault />
			
			<!-- Lighting -->
			<T.AmbientLight intensity={0.3} />
			<T.DirectionalLight position={[10, 10, 5]} intensity={0.8} />
			
			<!-- Controls -->
			<OrbitControls />
			
			<!-- Grid -->
			<T.Mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<T.PlaneGeometry args={[50, 50]} />
				<T.MeshStandardMaterial color="#1a1a1a" transparent opacity={0.5} />
			</T.Mesh>
			
			<!-- Columns -->
			{#each sp500Data as company, i}
				{(() => {
					const sectorIndex = [...new Set(sp500Data.map(c => c.sector))].indexOf(company.sector);
					const sectorSize = sp500Data.filter(c => c.sector === company.sector).length;
					const sectorPosition = sp500Data.filter(c => c.sector === company.sector).indexOf(company);
					const gridSize = Math.ceil(Math.sqrt(sectorSize));
					const row = Math.floor(sectorPosition / gridSize);
					const col = sectorPosition % gridSize;
					const x = (sectorIndex - 2) * 8 + (col - gridSize / 2) * 1.5;
					const z = (row - gridSize / 2) * 1.5;
					const height = Math.abs(company.priceChange) * 0.5;
					const size = Math.sqrt(company.marketCap / 1000000) * 0.1;
					
					return (
						<T.Mesh position={[x, height / 2, z]}>
							<T.BoxGeometry args={[size, height, size]} />
							<T.MeshStandardMaterial 
								color={company.priceChange >= 0 ? '#00ff88' : '#ff0088'}
								emissive={company.priceChange >= 0 ? '#00ff88' : '#ff0088'}
								emissiveIntensity={0.2}
								metalness={0.8}
								roughness={0.2}
							/>
						</T.Mesh>
					);
				})()}
			{/each}
		</Canvas>
		
		<!-- Legend -->
		<div class="absolute top-4 right-4 bg-black bg-opacity-80 rounded-lg p-4 border border-zinc-700">
			<div class="text-white text-sm">
				<div class="flex items-center gap-2 mb-2">
					<span class="w-3 h-3 bg-green-400 rounded-full"></span>
					<span>Positive Change</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 bg-red-400 rounded-full"></span>
					<span>Negative Change</span>
				</div>
			</div>
		</div>
		
		<!-- Info -->
		<div class="absolute bottom-4 left-4 bg-black bg-opacity-80 rounded-lg p-4 border border-zinc-700">
			<div class="text-white text-sm">
				<div>Companies: {sp500Data.length}</div>
				<div>Sectors: {new Set(sp500Data.map(c => c.sector)).size}</div>
			</div>
		</div>
	{/if}
</div>