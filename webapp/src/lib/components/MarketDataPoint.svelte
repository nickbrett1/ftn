<script>
	import { onMount, onDestroy } from 'svelte';
	import { T } from '@threlte/core';
	import { interactivity } from '@threlte/extras';
	import * as THREE from 'three';

	const { instrument, index } = $props();
	
	interactivity();

	let meshRef;
	let orbitRadius = 15 + (index % 3) * 2; // Different orbit levels
	let orbitSpeed = 0.5 + (index % 5) * 0.1; // Different speeds
	let orbitAngle = (index * Math.PI * 2) / 50; // Staggered starting positions
	let verticalOffset = (index % 2 === 0 ? 1 : -1) * (index % 4) * 0.5;
	let pulseIntensity = 0.5;
	let pulseDirection = 1;
	let tooltip = null;

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

		// Start animation loop
		animate();
	});

	onDestroy(() => {
		if (tooltip) {
			document.body.removeChild(tooltip);
		}
	});

	function animate() {
		if (!meshRef) return;

		// Update orbit position
		orbitAngle += orbitSpeed * 0.02;
		const x = Math.cos(orbitAngle) * orbitRadius;
		const z = Math.sin(orbitAngle) * orbitRadius;
		const y = verticalOffset + Math.sin(orbitAngle * 2) * 2; // Add some vertical movement

		meshRef.position.set(x, y, z);

		// Pulse effect
		pulseIntensity += pulseDirection * 0.02;
		if (pulseIntensity >= 1.0) {
			pulseDirection = -1;
		} else if (pulseIntensity <= 0.3) {
			pulseDirection = 1;
		}

		// Update material properties for dynamic effect
		if (meshRef.material) {
			meshRef.material.emissiveIntensity = pulseIntensity;
			meshRef.material.opacity = 0.7 + pulseIntensity * 0.3;
		}

		requestAnimationFrame(animate);
	}

	function handlePointerMove(event) {
		if (tooltip && instrument) {
			tooltip.innerHTML = `
				<div class="bg-black bg-opacity-95 text-white p-4 rounded-lg border border-zinc-600 shadow-2xl backdrop-blur-sm">
					<div class="font-bold text-lg text-cyan-400 mb-2">${instrument.symbol}</div>
					<div class="text-sm text-zinc-300 mb-1">${instrument.name}</div>
					<div class="text-lg font-bold ${instrument.priceChange >= 0 ? 'text-green-400' : 'text-red-400'} mb-2">
						${instrument.priceChange >= 0 ? '+' : ''}${instrument.priceChange.toFixed(2)}%
					</div>
					<div class="text-sm text-zinc-400 mb-1">
						Price: $${instrument.price.toFixed(2)}
					</div>
					<div class="text-xs text-zinc-500">
						Type: ${instrument.type} • Vol: ${instrument.volume}
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

	// Determine color based on instrument type and performance
	function getInstrumentColor() {
		if (instrument.priceChange >= 0) {
			return '#00ff88'; // Green for positive
		} else {
			return '#ff0088'; // Red for negative
		}
	}

	function getInstrumentEmissive() {
		if (instrument.priceChange >= 0) {
			return '#00ff88';
		} else {
			return '#ff0088';
		}
	}

	// Determine size based on volume/market cap
	function getInstrumentSize() {
		const baseSize = 0.8;
		const volumeFactor = Math.min(instrument.volume / 1000000, 2); // Cap at 2x
		return baseSize * (0.5 + volumeFactor * 0.5);
	}
</script>

<!-- Market data point with dynamic positioning and effects -->
<T.Mesh
	bind:ref={meshRef}
	userData={instrument}
	onPointerMove={handlePointerMove}
	onPointerOut={handlePointerOut}
>
	<!-- Use different geometries based on instrument type -->
	{#if instrument.type === 'Stock'}
		<T.BoxGeometry args={[getInstrumentSize(), getInstrumentSize(), getInstrumentSize()]} />
	{:else if instrument.type === 'Bond'}
		<T.CylinderGeometry args={[getInstrumentSize() * 0.5, getInstrumentSize() * 0.5, getInstrumentSize() * 2, 8]} />
	{:else if instrument.type === 'Crypto'}
		<T.OctahedronGeometry args={[getInstrumentSize() * 0.8]} />
	{:else if instrument.type === 'Forex'}
		<T.TorusGeometry args={[getInstrumentSize() * 0.6, getInstrumentSize() * 0.2, 8, 6]} />
	{:else}
		<T.SphereGeometry args={[getInstrumentSize() * 0.6, 8, 6]} />
	{/if}
	
	<T.MeshStandardMaterial
		color={getInstrumentColor()}
		emissive={getInstrumentEmissive()}
		emissiveIntensity={pulseIntensity}
		metalness={0.8}
		roughness={0.2}
		transparent={true}
		opacity={0.8}
	/>
</T.Mesh>

<!-- Add a subtle trail effect -->
<T.Line>
	<T.BufferGeometry>
		<T.BufferAttribute
			attach="attributes.position"
			args={[
				new Float32Array([
					Math.cos(orbitAngle) * orbitRadius,
					verticalOffset + Math.sin(orbitAngle * 2) * 2,
					Math.sin(orbitAngle) * orbitRadius,
					Math.cos(orbitAngle - 0.1) * orbitRadius,
					verticalOffset + Math.sin((orbitAngle - 0.1) * 2) * 2,
					Math.sin(orbitAngle - 0.1) * orbitRadius
				]),
				3
			]}
		/>
	</T.BufferGeometry>
	<T.LineBasicMaterial
		color={getInstrumentColor()}
		transparent={true}
		opacity={0.3}
		linewidth={1}
	/>
</T.Line>