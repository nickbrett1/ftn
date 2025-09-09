<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { T, Canvas } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import * as THREE from 'three';

	let isLoaded = $state(false);
	let hasError = $state(false);
	let errorMessage = $state('');
	let isClient = $state(false);
	let animationId = null;
	let time = $state(0);
	let isNight = $state(false);

	// NYC iconic buildings data
	const buildings = [
		// Financial District
		{ name: 'One World Trade Center', position: [0, 0, 0], height: 8, width: 1.5, depth: 1.5, color: '#2c3e50', isFinancial: true },
		{ name: 'Bank of America Tower', position: [-3, 0, 0], height: 6, width: 1.2, depth: 1.2, color: '#34495e', isFinancial: true },
		{ name: '40 Wall Street', position: [3, 0, 0], height: 5.5, width: 1, depth: 1, color: '#2c3e50', isFinancial: true },
		{ name: 'Federal Reserve Bank', position: [0, 0, -2], height: 4, width: 2, depth: 1.5, color: '#7f8c8d', isFinancial: true },
		
		// Midtown
		{ name: 'Empire State Building', position: [0, 0, 8], height: 10, width: 1.8, depth: 1.8, color: '#e74c3c', isFinancial: false },
		{ name: 'Chrysler Building', position: [-4, 0, 8], height: 9, width: 1.5, depth: 1.5, color: '#f39c12', isFinancial: false },
		{ name: 'MetLife Building', position: [4, 0, 8], height: 7, width: 2, depth: 1.5, color: '#95a5a6', isFinancial: true },
		{ name: 'Rockefeller Center', position: [0, 0, 12], height: 6, width: 2.5, depth: 2, color: '#34495e', isFinancial: true },
		
		// Additional Financial Buildings
		{ name: 'Goldman Sachs HQ', position: [-6, 0, 0], height: 5, width: 1.5, depth: 1.5, color: '#2c3e50', isFinancial: true },
		{ name: 'JP Morgan Chase', position: [6, 0, 0], height: 5.5, width: 1.8, depth: 1.2, color: '#34495e', isFinancial: true },
		{ name: 'Citigroup Center', position: [0, 0, 4], height: 6.5, width: 1.5, depth: 1.5, color: '#2c3e50', isFinancial: true },
		{ name: 'Morgan Stanley', position: [-2, 0, 4], height: 5, width: 1.2, depth: 1.2, color: '#34495e', isFinancial: true },
		
		// Supporting buildings
		{ name: 'Residential Tower 1', position: [-8, 0, 6], height: 4, width: 1, depth: 1, color: '#7f8c8d', isFinancial: false },
		{ name: 'Residential Tower 2', position: [8, 0, 6], height: 4.5, width: 1, depth: 1, color: '#7f8c8d', isFinancial: false },
		{ name: 'Office Building 1', position: [-5, 0, 10], height: 3.5, width: 1.2, depth: 1, color: '#95a5a6', isFinancial: false },
		{ name: 'Office Building 2', position: [5, 0, 10], height: 3.8, width: 1.2, depth: 1, color: '#95a5a6', isFinancial: false },
		{ name: 'Mixed Use Tower', position: [0, 0, 16], height: 4.2, width: 1.5, depth: 1.2, color: '#7f8c8d', isFinancial: false },
		{ name: 'Tech Building', position: [-3, 0, 16], height: 3.8, width: 1, depth: 1, color: '#3498db', isFinancial: false },
		{ name: 'Media Building', position: [3, 0, 16], height: 3.6, width: 1, depth: 1, color: '#9b59b6', isFinancial: false }
	];

	onMount(() => {
		try {
			isClient = true;
			isLoaded = true;
			startAnimation();
		} catch (error) {
			console.error('NYCSkylineDiorama: Error during initialization:', error);
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
		function animate() {
			time += 0.01;
			
			// Day/night cycle
			if (Math.floor(time * 0.1) % 2 === 0) {
				isNight = true;
			} else {
				isNight = false;
			}
			
			animationId = requestAnimationFrame(animate);
		}
		animate();
	}

	// Generate building window lights
	function generateWindowLights(building) {
		const lights = [];
		const windowCount = Math.floor(building.height * 2);
		for (let i = 0; i < windowCount; i++) {
			const floor = Math.floor(i / 4);
			const side = i % 4;
			const x = building.position[0] + (side < 2 ? -building.width/2 : building.width/2);
			const y = building.position[1] + (floor * 0.5) + 0.5;
			const z = building.position[2] + (side % 2 === 0 ? -building.depth/2 : building.depth/2);
			
			if (Math.random() > 0.3) { // 70% of windows are lit
				lights.push({ position: [x, y, z], intensity: Math.random() * 0.5 + 0.3 });
			}
		}
		return lights;
	}
</script>

<div class="relative w-full h-full">
	{#if !browser}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
				<p class="text-lg text-white mb-2">NYC Skyline</p>
				<p class="text-sm text-zinc-400">This component requires a browser environment</p>
			</div>
		</div>
	{:else if !isClient}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-green-400 border-t-transparent animate-spin mx-auto mb-4"></div>
				<p class="text-lg text-white mb-2">Initializing Skyline</p>
				<p class="text-sm text-zinc-400">Loading 3D components...</p>
			</div>
		</div>
	{:else if hasError}
		<div class="w-full h-full bg-black p-4 overflow-auto">
			<div class="text-center text-white mb-4">
				<h2 class="text-xl font-bold mb-2">NYC Skyline Diorama</h2>
				<p class="text-sm text-zinc-400">3D rendering failed</p>
				<p class="text-xs text-red-400 mt-2">{errorMessage}</p>
			</div>
			<div class="text-center mt-6">
				<button 
					class="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
					onclick={() => {
						hasError = false;
						errorMessage = '';
					}}
				>
					Try Again
				</button>
			</div>
		</div>
	{:else if !isLoaded}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-yellow-400 border-t-transparent animate-spin mx-auto mb-4"></div>
				<p class="text-lg text-white mb-2">Loading Skyline</p>
				<p class="text-sm text-zinc-400">Preparing 3D visualization...</p>
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
						console.error('NYCSkylineDiorama: Error configuring renderer:', error);
						hasError = true;
						errorMessage = `Renderer error: ${error.message}`;
					}
				}}
				onerror={(error) => {
					console.error('NYCSkylineDiorama: Canvas error:', error);
					hasError = true;
					errorMessage = `Canvas error: ${error.message || 'Unknown error'}`;
				}}
				gl={{ 
					antialias: true,
					alpha: false
				}}
			>
				<!-- Dynamic sky background -->
				<T.Color attach="background" args={isNight ? ['#0a0a1a'] : ['#87ceeb']} />
				
				<!-- Ambient lighting -->
				<T.AmbientLight intensity={isNight ? 0.2 : 0.6} color={isNight ? "#4a4a6a" : "#ffffff"} />
				
				<!-- Sun/Moon -->
				{#if isNight}
					<T.DirectionalLight position={[10, 10, 5]} intensity={0.3} color="#4a4a6a" />
					<T.PointLight position={[0, 15, 0]} intensity={0.8} color="#f0f0ff" distance={50} />
				{:else}
					<T.DirectionalLight position={[10, 10, 5]} intensity={1.0} color="#ffaa44" />
					<T.PointLight position={[0, 15, 0]} intensity={0.5} color="#ffffff" distance={50} />
				{/if}
				
				<!-- Ground plane (streets) -->
				<T.Mesh position={[0, -0.5, 8]} rotation={[-Math.PI / 2, 0, 0]}>
					<T.PlaneGeometry args={[40, 30]} />
					<T.MeshStandardMaterial
						color={isNight ? "#1a1a1a" : "#4a4a4a"}
						emissive={isNight ? "#0a0a0a" : "#2a2a2a"}
						emissiveIntensity={0.1}
						metalness={0.1}
						roughness={0.8}
					/>
				</T.Mesh>
				
				<!-- Hudson River -->
				<T.Mesh position={[0, -0.4, -8]} rotation={[-Math.PI / 2, 0, 0]}>
					<T.PlaneGeometry args={[40, 8]} />
					<T.MeshStandardMaterial
						color={isNight ? "#1a2a4a" : "#4682b4"}
						emissive={isNight ? "#0a1a2a" : "#2a4a6a"}
						emissiveIntensity={0.1}
						metalness={0.3}
						roughness={0.2}
						transparent={true}
						opacity={0.8}
					/>
				</T.Mesh>
				
				<!-- Buildings -->
				{#each buildings as building}
					<T.Mesh position={building.position}>
						<T.BoxGeometry args={[building.width, building.height, building.depth]} />
						<T.MeshStandardMaterial
							color={building.color}
							emissive={building.isFinancial && isNight ? "#1a3a5a" : "#000000"}
							emissiveIntensity={building.isFinancial && isNight ? 0.1 : 0}
							metalness={0.2}
							roughness={0.7}
						/>
					</T.Mesh>
					
					<!-- Building windows/lights -->
					{#if isNight}
						{#each generateWindowLights(building) as light}
							<T.PointLight 
								position={light.position} 
								intensity={light.intensity} 
								color="#ffff88" 
								distance={2}
							/>
						{/each}
					{/if}
					
					<!-- Building tops (spires, antennas) -->
					{#if building.name === 'Empire State Building'}
						<T.Mesh position={[building.position[0], building.position[1] + building.height/2 + 1, building.position[2]]}>
							<T.ConeGeometry args={[0.3, 2, 8]} />
							<T.MeshStandardMaterial
								color="#c0392b"
								emissive={isNight ? "#ff0000" : "#000000"}
								emissiveIntensity={isNight ? 0.3 : 0}
								metalness={0.8}
								roughness={0.2}
							/>
						</T.Mesh>
					{/if}
					
					{#if building.name === 'One World Trade Center'}
						<T.Mesh position={[building.position[0], building.position[1] + building.height/2 + 0.5, building.position[2]]}>
							<T.ConeGeometry args={[0.2, 1, 8]} />
							<T.MeshStandardMaterial
								color="#34495e"
								emissive={isNight ? "#3498db" : "#000000"}
								emissiveIntensity={isNight ? 0.2 : 0}
								metalness={0.8}
								roughness={0.2}
							/>
						</T.Mesh>
					{/if}
				{/each}
				
				<!-- Street lights -->
				{#if isNight}
					{#each Array.from({ length: 20 }, (_, i) => i) as i}
						<T.PointLight 
							position={[(i - 10) * 2, 2, 8]} 
							intensity={0.5} 
							color="#ffff88" 
							distance={8}
						/>
						<T.Mesh position={[(i - 10) * 2, 1, 8]}>
							<T.CylinderGeometry args={[0.05, 0.05, 2]} />
							<T.MeshStandardMaterial
								color="#666666"
								emissive="#333333"
								emissiveIntensity={0.1}
							/>
						</T.Mesh>
					{/each}
				{/if}
				
				<!-- Water reflections -->
				{#if isNight}
					{#each buildings.filter(b => b.position[2] < 0) as building}
						<T.Mesh position={[building.position[0], -building.height/2 - 0.8, building.position[2]]}>
							<T.BoxGeometry args={[building.width, building.height, building.depth]} />
							<T.MeshBasicMaterial
								color={building.color}
								transparent={true}
								opacity={0.3}
							/>
						</T.Mesh>
					{/each}
				{/if}
				
				<!-- Fog for atmosphere -->
				<T.Fog attach="fog" args={[isNight ? "#0a0a1a" : "#87ceeb", 20, 100]} />
				
				<!-- Camera setup -->
				<T.PerspectiveCamera
					position={[0, 8, 25]}
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
						minPolarAngle={Math.PI / 6}
						maxPolarAngle={Math.PI / 2.2}
					/>
				</T.PerspectiveCamera>
			</Canvas>
			
			<!-- Info overlay -->
			<div class="absolute top-4 left-4 z-20 bg-black bg-opacity-90 rounded-lg p-4 border border-zinc-700">
				<div class="text-white text-sm">
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 bg-blue-600 rounded"></span>
						<span>Financial District</span>
					</div>
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 bg-red-500 rounded"></span>
						<span>Iconic Landmarks</span>
					</div>
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 bg-gray-500 rounded"></span>
						<span>Business District</span>
					</div>
					<div class="text-xs text-zinc-400 mt-3">
						{isNight ? '🌙 Night View' : '☀️ Day View'} • Auto-rotating
					</div>
				</div>
			</div>
			
			<!-- Building labels -->
			<div class="absolute top-4 right-4 z-20 bg-black bg-opacity-90 rounded-lg p-4 border border-zinc-700 max-w-xs">
				<div class="text-white text-sm">
					<h3 class="font-bold mb-2 text-blue-400">Financial Capital of the World</h3>
					<div class="space-y-1 text-xs">
						<div>🏦 One World Trade Center</div>
						<div>🏛️ Federal Reserve Bank</div>
						<div>💼 Goldman Sachs HQ</div>
						<div>🏢 JP Morgan Chase</div>
						<div>📈 Wall Street District</div>
					</div>
					<div class="text-xs text-zinc-400 mt-3">
						Home to the world's largest financial markets
					</div>
				</div>
			</div>
			
			<!-- Instructions -->
			<div class="absolute bottom-4 left-4 z-20 bg-black bg-opacity-80 rounded-lg p-3 border border-zinc-700">
				<div class="text-white text-xs">
					<div class="flex items-center gap-2 mb-1">
						<span class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
						<span>{isNight ? 'Night Mode' : 'Day Mode'}</span>
					</div>
					<div class="text-zinc-400">
						Drag to rotate • Scroll to zoom • Day/night cycle
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>