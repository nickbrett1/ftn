<script>
	import { onMount } from 'svelte';
	import { $props } from 'svelte';
	import { T } from '@threlte/core';
	import { interactivity } from '@threlte/extras';
	import tippy from 'tippy.js';
	import 'tippy.js/dist/tippy.css';

	const { sp500Data } = $props();

	interactivity();

	let columns = $state([]);
	let tooltipInstances = $state([]);

	onMount(() => {
		// Cleanup tooltips on unmount
		return () => {
			tooltipInstances.forEach(instance => instance.destroy());
		};
	});

	// Calculate column dimensions and positions
	$: if (sp500Data) {
		columns = sp500Data.map((security, index) => {
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
			const x = (sectorIndex - 2) * sectorSpacing + (col - gridSize / 2) * 1.5;
			const z = (row - gridSize / 2) * 1.5;
			
			// Column dimensions based on market cap and price change
			const baseSize = Math.sqrt(security.marketCap / 1000000) * 0.1; // Scale market cap
			const height = Math.abs(security.priceChange) * 0.5; // Scale price change
			const y = height / 2; // Center vertically
			
			return {
				...security,
				position: [x, y, z],
				dimensions: [baseSize, height, baseSize],
				index
			};
		});
	}

	// Create tooltip for a column
	function createTooltip(column, security) {
		const tooltipContent = `
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

		const instance = tippy(column, {
			content: tooltipContent,
			allowHTML: true,
			theme: 'custom',
			placement: 'top',
			arrow: true,
			interactive: false,
			appendTo: () => document.body,
			onCreate(instance) {
				// Add custom styling
				instance.popper.classList.add('tippy-custom');
			}
		});

		tooltipInstances.push(instance);
		return instance;
	}

	// Create gradient material for columns
	function createGradientMaterial(isPositive, maxHeight) {
		const colors = isPositive 
			? ['#00ff00', '#00ff88', '#00ffff'] // Green gradient
			: ['#ff0000', '#ff0088', '#ff00ff']; // Red gradient
		
		return new T.MeshStandardMaterial({
			color: colors[0],
			emissive: colors[0],
			emissiveIntensity: 0.2,
			metalness: 0.8,
			roughness: 0.2,
			transparent: true,
			opacity: 0.9
		});
	}
</script>

{#each columns as column (column.index)}
	{@const isPositive = column.priceChange >= 0}
	{@const material = createGradientMaterial(isPositive, column.dimensions[1])}
	
			<T.Mesh
			position={column.position}
			userData={column}
			castShadow
			receiveShadow
			oncreate={(ref) => {
				// Create tooltip for this column
				createTooltip(ref, column);
			}}
		>
		<T.BoxGeometry args={column.dimensions} />
		<T.MeshStandardMaterial
			color={isPositive ? '#00ff88' : '#ff4444'}
			emissive={isPositive ? '#00ff44' : '#ff0000'}
			emissiveIntensity={0.3}
			metalness={0.9}
			roughness={0.1}
			transparent
			opacity={0.9}
		/>
		
		<!-- Add neon glow effect -->
		<T.Mesh position={[0, 0, 0]}>
			<T.BoxGeometry args={[
				column.dimensions[0] + 0.1, 
				column.dimensions[1] + 0.1, 
				column.dimensions[2] + 0.1
			]} />
			<T.MeshBasicMaterial
				color={isPositive ? '#00ff88' : '#ff4444'}
				transparent
				opacity={0.1}
				side="BackSide"
			/>
		</T.Mesh>
	</T.Mesh>

	<!-- Add stock symbol label if there's space -->
	{#if column.dimensions[1] > 2}
		<T.Mesh position={[column.position[0], column.position[1] + column.dimensions[1] / 2 + 0.3, column.position[2]]}>
			<T.PlaneGeometry args={[1, 0.5]} />
			<T.MeshBasicMaterial
				color="#000000"
				transparent
				opacity={0.8}
				side="DoubleSide"
			/>
		</T.Mesh>
	{/if}
{/each}

	<!-- Tippy.js will handle tooltips automatically -->
</div>

<style>
	/* Custom Tippy.js styling to match the futuristic neon theme */
	:global(.tippy-custom) {
		background-color: rgba(0, 0, 0, 0.95) !important;
		border: 1px solid #374151 !important;
		border-radius: 0.5rem !important;
		box-shadow: 0 0 20px rgba(0, 255, 136, 0.3) !important;
	}

	:global(.tippy-custom .tippy-arrow) {
		color: rgba(0, 0, 0, 0.95) !important;
	}

	:global(.tippy-custom .tippy-content) {
		padding: 0 !important;
	}
</style>