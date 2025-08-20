<script>
	import { onMount, onDestroy } from 'svelte';
	import { T } from '@threlte/core';
	import { interactivity } from '@threlte/extras';
	import * as THREE from 'three';

	const { center, index } = $props();
	
	interactivity();

	let markerRef;
	let pulseIntensity = 0.5;
	let pulseDirection = 1;
	let tooltip = null;
	let marketData = $state([]);

	onMount(() => {
		// Create tooltip element
		tooltip = document.createElement('div');
		tooltip.style.cssText = `
			position: fixed;
			display: none;
			z-index: 1000;
			pointer-events: none;
			font-family: 'Inter', sans-serif;
		`;
		document.body.appendChild(tooltip);

		// Generate market data for this financial center
		generateMarketData();

		// Start animation loop
		animate();
	});

	onDestroy(() => {
		if (tooltip) {
			document.body.removeChild(tooltip);
		}
	});

	function generateMarketData() {
		// Generate sample market data for this financial center
		const marketTypes = ['Stocks', 'Bonds', 'Forex', 'Commodities'];
		marketData = marketTypes.map(type => ({
			type,
			change: (Math.random() - 0.5) * 4, // -2% to +2%
			volume: Math.random() * 1000000000 + 100000000 // 100M to 1.1B
		}));
	}

	function animate() {
		if (!markerRef) return;

		// Pulse effect
		pulseIntensity += pulseDirection * 0.02;
		if (pulseIntensity >= 1.0) {
			pulseDirection = -1;
		} else if (pulseIntensity <= 0.3) {
			pulseDirection = 1;
		}

		// Update material properties for dynamic effect
		if (markerRef.material) {
			markerRef.material.emissiveIntensity = pulseIntensity;
			markerRef.material.opacity = 0.7 + pulseIntensity * 0.3;
		}

		requestAnimationFrame(animate);
	}

	function handlePointerMove(event) {
		if (tooltip && center) {
			tooltip.innerHTML = `
				<div class="bg-black bg-opacity-95 text-white p-4 rounded-lg border border-zinc-600 shadow-2xl backdrop-blur-sm min-w-64">
					<div class="font-bold text-lg text-cyan-400 mb-2">${center.name}</div>
					<div class="text-sm text-zinc-300 mb-1">${center.country}</div>
					<div class="text-sm text-zinc-400 mb-2">${center.timezone}</div>
					
					<div class="mb-3">
						<div class="text-sm font-semibold text-zinc-300 mb-2">Market Sentiment</div>
						<div class="text-lg font-bold ${center.marketSentiment >= 0 ? 'text-green-400' : 'text-red-400'}">
							${center.marketSentiment >= 0 ? '+' : ''}${center.marketSentiment.toFixed(1)}%
						</div>
					</div>
					
					<div class="mb-3">
						<div class="text-sm font-semibold text-zinc-300 mb-2">Key Markets</div>
						<div class="text-xs text-zinc-400">${center.markets.join(', ')}</div>
					</div>
					
					<div class="mb-3">
						<div class="text-sm font-semibold text-zinc-300 mb-2">Live Market Data</div>
						${marketData.map(market => `
							<div class="flex justify-between items-center text-xs mb-1">
								<span class="text-zinc-400">${market.type}</span>
								<span class="${market.change >= 0 ? 'text-green-400' : 'text-red-400'}">
									${market.change >= 0 ? '+' : ''}${market.change.toFixed(2)}%
								</span>
							</div>
						`).join('')}
					</div>
					
					<div class="text-xs text-zinc-500">
						💡 Click to focus on this region
					</div>
				</div>
			`;
			
			tooltip.style.display = 'block';
			tooltip.style.left = event.clientX + 15 + 'px';
			tooltip.style.top = event.clientY - 15 + 'px';
		}
	}

	function handlePointerOut() {
		if (tooltip) {
			tooltip.style.display = 'none';
		}
	}

	// Convert lat/lng to 3D position on the globe
	function getGlobePosition() {
		const radius = 10.2; // Slightly larger than Earth radius for visibility
		const lat = center.latitude * (Math.PI / 180);
		const lng = center.longitude * (Math.PI / 180);
		
		const x = radius * Math.cos(lat) * Math.cos(lng);
		const y = radius * Math.sin(lat);
		const z = radius * Math.cos(lat) * Math.sin(lng);
		
		return [x, y, z];
	}

	// Determine marker color based on market sentiment
	function getMarkerColor() {
		if (center.marketSentiment >= 0) {
			return '#00ff88'; // Green for positive
		} else {
			return '#ff0088'; // Red for negative
		}
	}

	function getMarkerEmissive() {
		if (center.marketSentiment >= 0) {
			return '#00ff88';
		} else {
			return '#ff0088';
		}
	}

	// Determine marker size based on market importance
	function getMarkerSize() {
		const baseSize = 0.4;
		const importanceFactor = center.importance || 1;
		return baseSize * (0.8 + importanceFactor * 0.4);
	}
</script>

<!-- Financial center marker positioned on the globe -->
<T.Mesh
	bind:ref={markerRef}
	position={getGlobePosition()}
	userData={center}
	onPointerMove={handlePointerMove}
	onPointerOut={handlePointerOut}
>
	<!-- Marker geometry - use a cone pointing outward from the globe -->
	<T.ConeGeometry 
		args={[getMarkerSize(), getMarkerSize() * 2, 8]} 
	/>
	<T.MeshStandardMaterial
		color={getMarkerColor()}
		emissive={getMarkerEmissive()}
		emissiveIntensity={pulseIntensity}
		metalness={0.8}
		roughness={0.2}
		transparent={true}
		opacity={0.9}
	/>
</T.Mesh>

<!-- Add a subtle glow effect around the marker -->
<T.Mesh position={getGlobePosition()}>
	<T.SphereGeometry args={[getMarkerSize() * 1.5, 8, 6]} />
	<T.MeshBasicMaterial
		color={getMarkerColor()}
		transparent={true}
		opacity={0.2}
	/>
</T.Mesh>

<!-- Add market data indicators floating above the marker -->
{#each marketData as market, marketIndex}
	<T.Mesh 
		position={[
			getGlobePosition()[0] + (marketIndex - 1.5) * 0.3,
			getGlobePosition()[1] + 1.5,
			getGlobePosition()[2]
		]}
	>
		<T.SphereGeometry args={[0.1, 6, 6]} />
		<T.MeshBasicMaterial
			color={market.change >= 0 ? '#00ff88' : '#ff0088'}
			emissive={market.change >= 0 ? '#00ff88' : '#ff0088'}
			emissiveIntensity={0.8}
			transparent={true}
			opacity={0.7}
		/>
	</T.Mesh>
{/each}