<script>
	import { onMount } from 'svelte';
	import { T } from '@threlte/core';
	import { interactivity } from '@threlte/extras';

	const { sp500Data } = $props();

	interactivity();

	let columns = $state([]);
	let tooltip = null;

	onMount(() => {
		console.log('HeatmapColumns: Component mounted with data:', sp500Data);
		
		try {
			// Process data
			if (!sp500Data || !Array.isArray(sp500Data) || sp500Data.length === 0) {
				console.warn('HeatmapColumns: No data provided or invalid data format');
				columns = [];
			} else {
				columns = sp500Data.map((security, index) => {
					// Validate security data
					if (!security || !security.sector || typeof security.marketCap !== 'number' || typeof security.priceChange !== 'number') {
						console.warn('HeatmapColumns: Invalid security data:', security);
						return null;
					}
					
					const sector = security.sector;
					const sectorIndex = [...new Set(sp500Data.map(s => s.sector))].indexOf(sector);
					const sectorSize = sp500Data.filter(s => s.sector === sector).length;
					const sectorPosition = sp500Data.filter(s => s.sector === sector).indexOf(security);
					
					// Position within sector grid
					const gridSize = Math.ceil(Math.sqrt(sectorSize));
					const row = Math.floor(sectorPosition / gridSize);
					const col = sectorPosition % gridSize;
					
					// Sector positioning (spread sectors out)
					const sectorSpacing = 8;
					const x = (sectorIndex - 2) * sectorSpacing + (col - gridSize / 2) * 1.0; // Reduced spacing from 1.5 to 1.0
					const z = (row - gridSize / 2) * 1.0; // Reduced spacing from 1.5 to 1.0
					
					// Column dimensions based on market cap and price change
					// Make base size proportional to market cap (square root for better visual balance)
					const baseSize = Math.max(0.4, Math.sqrt(security.marketCap / 50) * 0.3); // Improved scaling with larger minimum
					const height = Math.max(0.5, Math.abs(security.priceChange) * 0.5);
					
					// Position bars: positive above floor (y=0), negative below floor
					let y;
					if (security.priceChange >= 0) {
						y = height / 2; // Positive bars extend upward from floor
					} else {
						y = -height / 2; // Negative bars extend downward from floor
					}
					
					return {
						...security,
						position: [x, y, z],
						dimensions: [baseSize, height, baseSize],
						index
					};
				}).filter(Boolean); // Remove null entries
				
				console.log('HeatmapColumns: Processed columns:', columns);
				console.log('HeatmapColumns: Sample column data:', columns[0]);
			}
		} catch (error) {
			console.error('HeatmapColumns: Error processing data:', error);
			columns = [];
		}
		
		// Create tooltip element
		tooltip = document.createElement('div');
		tooltip.style.cssText = `
			position: fixed;
			display: none;
			z-index: 1000;
			pointer-events: none;
		`;
		document.body.appendChild(tooltip);
	});

	// Handle column hover
	function handlePointerMove(event) {
		if (tooltip && event.object.userData) {
			const security = event.object.userData;
			tooltip.innerHTML = `
				<div class="bg-black bg-opacity-90 text-white p-3 rounded-lg border border-zinc-700 shadow-lg">
					<div class="font-bold text-green-400">${security.ticker}</div>
					<div class="text-sm">${security.name}</div>
					<div class="text-sm ${security.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}">
						${security.priceChange >= 0 ? '+' : ''}${security.priceChange.toFixed(2)}%
					</div>
					<div class="text-xs text-zinc-400">
						Market Cap: $${(security.marketCap / 1000000000).toFixed(1)}B
					</div>
					<div class="text-xs text-zinc-400">
						Sector: ${security.sector}
					</div>
				</div>
			`;
			
			tooltip.style.display = 'block';
			tooltip.style.left = event.clientX + 10 + 'px';
			tooltip.style.top = event.clientY - 10 + 'px';
		}
	}

	function handlePointerOut() {
		if (tooltip) {
			tooltip.style.display = 'none';
		}
	}
</script>

<!-- Debug info -->
{#if columns.length === 0}
	<div class="absolute inset-0 flex items-center justify-center text-white text-lg">
		No data available for heatmap
	</div>
{:else}
	<!-- Debug overlay showing column count -->
	<div class="absolute top-4 left-4 z-30 bg-black bg-opacity-80 text-white p-2 rounded text-xs">
		Columns: {columns.length}
	</div>
	
	<!-- Debug overlay showing sample data -->
	{#if columns.length > 0}
		<div class="absolute top-16 left-4 z-30 bg-black bg-opacity-80 text-white p-2 rounded text-xs">
			Sample: {columns[0].ticker}<br/>
			Market Cap: ${(columns[0].marketCap / 1000000000).toFixed(1)}B<br/>
			Size: {columns[0].dimensions[0].toFixed(2)}<br/>
			Height: {columns[0].dimensions[1].toFixed(2)}
		</div>
	{/if}
{/if}

<!-- Render each column -->
{#each columns as column (column.index)}
	<T.Mesh
		position={column.position}
		userData={column}
		onPointerMove={handlePointerMove}
		onPointerOut={handlePointerOut}
	>
		<T.BoxGeometry args={column.dimensions} />
		<T.MeshStandardMaterial
			color={column.priceChange >= 0 ? '#00ff88' : '#ff0088'}
			emissive={column.priceChange >= 0 ? '#00ff88' : '#ff0088'}
			emissiveIntensity={0.3}
			metalness={0.8}
			roughness={0.2}
			transparent={true}
			opacity={0.9}
		/>
	</T.Mesh>
{/each}