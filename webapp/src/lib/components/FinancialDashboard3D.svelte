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

	// Market data for visualization
	const marketData = $state({
		sp500: { value: 4785.23, change: 1.23, changePercent: 0.026 },
		nasdaq: { value: 15011.35, change: -0.45, changePercent: -0.003 },
		dow: { value: 37592.98, change: 0.78, changePercent: 0.002 },
		bitcoin: { value: 43250.00, change: 1250.00, changePercent: 0.029 },
		portfolio: { value: 125000, change: 2500, changePercent: 0.02 }
	});

	// Generate sample chart data
	function generateChartData(points = 50) {
		const data = [];
		let value = 100;
		for (let i = 0; i < points; i++) {
			value += (Math.random() - 0.5) * 5;
			data.push(value);
		}
		return data;
	}

	const chartData = {
		portfolio: generateChartData(),
		sp500: generateChartData(),
		bitcoin: generateChartData()
	};

	onMount(() => {
		try {
			isClient = true;
			isLoaded = true;
			startAnimation();
		} catch (error) {
			console.error('FinancialDashboard3D: Error during initialization:', error);
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
			
			// Update market data with small random changes
			marketData.sp500.value += (Math.random() - 0.5) * 0.1;
			marketData.nasdaq.value += (Math.random() - 0.5) * 0.1;
			marketData.dow.value += (Math.random() - 0.5) * 0.1;
			marketData.bitcoin.value += (Math.random() - 0.5) * 10;
			marketData.portfolio.value += (Math.random() - 0.5) * 50;
			
			animationId = requestAnimationFrame(animate);
		}
		animate();
	}

	// Create 3D chart geometry
	function createChartGeometry(data, width = 4, height = 2) {
		const points = [];
		const maxValue = Math.max(...data);
		const minValue = Math.min(...data);
		const range = maxValue - minValue;
		
		for (let i = 0; i < data.length; i++) {
			const x = (i / (data.length - 1)) * width - width / 2;
			const y = ((data[i] - minValue) / range) * height - height / 2;
			points.push(new THREE.Vector3(x, y, 0));
		}
		
		const geometry = new THREE.BufferGeometry().setFromPoints(points);
		return geometry;
	}
</script>

<div class="relative w-full h-full">
	{#if !browser}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
				<p class="text-lg text-white mb-2">Financial Dashboard</p>
				<p class="text-sm text-zinc-400">This component requires a browser environment</p>
			</div>
		</div>
	{:else if !isClient}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-green-400 border-t-transparent animate-spin mx-auto mb-4"></div>
				<p class="text-lg text-white mb-2">Initializing Dashboard</p>
				<p class="text-sm text-zinc-400">Loading 3D components...</p>
			</div>
		</div>
	{:else if hasError}
		<div class="w-full h-full bg-black p-4 overflow-auto">
			<div class="text-center text-white mb-4">
				<h2 class="text-xl font-bold mb-2">Financial Dashboard</h2>
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
				<p class="text-lg text-white mb-2">Loading Dashboard</p>
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
						console.error('FinancialDashboard3D: Error configuring renderer:', error);
						hasError = true;
						errorMessage = `Renderer error: ${error.message}`;
					}
				}}
				onerror={(error) => {
					console.error('FinancialDashboard3D: Canvas error:', error);
					hasError = true;
					errorMessage = `Canvas error: ${error.message || 'Unknown error'}`;
				}}
				gl={{ 
					antialias: true,
					alpha: false
				}}
			>
				<!-- Professional dark background -->
				<T.Color attach="background" args={['#0a0a0f']} />
				
				<!-- Ambient lighting -->
				<T.AmbientLight intensity={0.4} color="#ffffff" />
				
				<!-- Main directional light -->
				<T.DirectionalLight position={[10, 10, 5]} intensity={0.8} color="#ffffff" />
				
				<!-- Accent lighting -->
				<T.PointLight position={[0, 5, 10]} intensity={0.6} color="#00ff88" distance={30} />
				<T.PointLight position={[0, -5, -10]} intensity={0.4} color="#ff6b35" distance={30} />
				
				<!-- Floating metric cards -->
				<!-- S&P 500 Card -->
				<T.Mesh position={[-8, 6, 0]}>
					<T.BoxGeometry args={[3, 2, 0.2]} />
					<T.MeshStandardMaterial
						color="#1a1a2e"
						emissive="#16213e"
						emissiveIntensity={0.1}
						metalness={0.3}
						roughness={0.2}
					/>
				</T.Mesh>
				
				<!-- NASDAQ Card -->
				<T.Mesh position={[-8, 3, 0]}>
					<T.BoxGeometry args={[3, 2, 0.2]} />
					<T.MeshStandardMaterial
						color="#1a1a2e"
						emissive="#16213e"
						emissiveIntensity={0.1}
						metalness={0.3}
						roughness={0.2}
					/>
				</T.Mesh>
				
				<!-- DOW Card -->
				<T.Mesh position={[-8, 0, 0]}>
					<T.BoxGeometry args={[3, 2, 0.2]} />
					<T.MeshStandardMaterial
						color="#1a1a2e"
						emissive="#16213e"
						emissiveIntensity={0.1}
						metalness={0.3}
						roughness={0.2}
					/>
				</T.Mesh>
				
				<!-- Bitcoin Card -->
				<T.Mesh position={[-8, -3, 0]}>
					<T.BoxGeometry args={[3, 2, 0.2]} />
					<T.MeshStandardMaterial
						color="#1a1a2e"
						emissive="#f7931a"
						emissiveIntensity={0.2}
						metalness={0.3}
						roughness={0.2}
					/>
				</T.Mesh>
				
				<!-- Portfolio Card -->
				<T.Mesh position={[-8, -6, 0]}>
					<T.BoxGeometry args={[3, 2, 0.2]} />
					<T.MeshStandardMaterial
						color="#1a1a2e"
						emissive="#00ff88"
						emissiveIntensity={0.2}
						metalness={0.3}
						roughness={0.2}
					/>
				</T.Mesh>
				
				<!-- 3D Charts -->
				<!-- Portfolio Performance Chart -->
				<T.Line position={[0, 6, 0]}>
					<T.BufferGeometry>
						<T.BufferAttribute
							attach="attributes.position"
							args={[
								new Float32Array(
									chartData.portfolio.map((value, i) => {
										const x = (i / (chartData.portfolio.length - 1)) * 6 - 3;
										const y = (value / 100 - 1) * 2;
										return [x, y, 0];
									}).flat()
								),
								3
							]}
						/>
					</T.BufferGeometry>
					<T.LineBasicMaterial
						color="#00ff88"
						linewidth={3}
						transparent={true}
						opacity={0.8}
					/>
				</T.Line>
				
				<!-- S&P 500 Chart -->
				<T.Line position={[0, 0, 0]}>
					<T.BufferGeometry>
						<T.BufferAttribute
							attach="attributes.position"
							args={[
								new Float32Array(
									chartData.sp500.map((value, i) => {
										const x = (i / (chartData.sp500.length - 1)) * 6 - 3;
										const y = (value / 100 - 1) * 2;
										return [x, y, 0];
									}).flat()
								),
								3
							]}
						/>
					</T.BufferGeometry>
					<T.LineBasicMaterial
						color="#4f46e5"
						linewidth={3}
						transparent={true}
						opacity={0.8}
					/>
				</T.Line>
				
				<!-- Bitcoin Chart -->
				<T.Line position={[0, -6, 0]}>
					<T.BufferGeometry>
						<T.BufferAttribute
							attach="attributes.position"
							args={[
								new Float32Array(
									chartData.bitcoin.map((value, i) => {
										const x = (i / (chartData.bitcoin.length - 1)) * 6 - 3;
										const y = (value / 100 - 1) * 2;
										return [x, y, 0];
									}).flat()
								),
								3
							]}
						/>
					</T.BufferGeometry>
					<T.LineBasicMaterial
						color="#f7931a"
						linewidth={3}
						transparent={true}
						opacity={0.8}
					/>
				</T.Line>
				
				<!-- Chart backgrounds -->
				<T.Mesh position={[0, 6, -0.1]}>
					<T.PlaneGeometry args={[6, 2]} />
					<T.MeshBasicMaterial
						color="#1a1a2e"
						transparent={true}
						opacity={0.3}
					/>
				</T.Mesh>
				
				<T.Mesh position={[0, 0, -0.1]}>
					<T.PlaneGeometry args={[6, 2]} />
					<T.MeshBasicMaterial
						color="#1a1a2e"
						transparent={true}
						opacity={0.3}
					/>
				</T.Mesh>
				
				<T.Mesh position={[0, -6, -0.1]}>
					<T.PlaneGeometry args={[6, 2]} />
					<T.MeshBasicMaterial
						color="#1a1a2e"
						transparent={true}
						opacity={0.3}
					/>
				</T.Mesh>
				
				<!-- Floating data points -->
				{#each Array.from({ length: 20 }, (_, i) => i) as i}
					<T.Mesh position={[
						(Math.random() - 0.5) * 20,
						(Math.random() - 0.5) * 20,
						(Math.random() - 0.5) * 20
					]}>
						<T.SphereGeometry args={[0.1, 8, 8]} />
						<T.MeshBasicMaterial
							color={Math.random() > 0.5 ? "#00ff88" : "#ff6b35"}
							transparent={true}
							opacity={0.6}
						/>
					</T.Mesh>
				{/each}
				
				<!-- Grid lines for reference -->
				<T.GridHelper args={[30, 30, "#2a2a3e", "#2a2a3e"]} />
				
				<!-- Camera setup -->
				<T.PerspectiveCamera
					position={[0, 0, 15]}
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
						minDistance={10}
						maxDistance={30}
					/>
				</T.PerspectiveCamera>
			</Canvas>
			
			<!-- Live data overlay -->
			<div class="absolute top-4 left-4 z-20 bg-black bg-opacity-90 rounded-lg p-4 border border-zinc-700">
				<div class="text-white text-sm space-y-2">
					<div class="flex items-center justify-between gap-4">
						<span class="text-zinc-400">S&P 500</span>
						<span class="font-mono">{marketData.sp500.value.toFixed(2)}</span>
						<span class="text-green-400 text-xs">+{marketData.sp500.changePercent.toFixed(3)}%</span>
					</div>
					<div class="flex items-center justify-between gap-4">
						<span class="text-zinc-400">NASDAQ</span>
						<span class="font-mono">{marketData.nasdaq.value.toFixed(2)}</span>
						<span class="text-red-400 text-xs">{marketData.nasdaq.changePercent.toFixed(3)}%</span>
					</div>
					<div class="flex items-center justify-between gap-4">
						<span class="text-zinc-400">DOW</span>
						<span class="font-mono">{marketData.dow.value.toFixed(2)}</span>
						<span class="text-green-400 text-xs">+{marketData.dow.changePercent.toFixed(3)}%</span>
					</div>
					<div class="flex items-center justify-between gap-4">
						<span class="text-zinc-400">Bitcoin</span>
						<span class="font-mono">${marketData.bitcoin.value.toFixed(2)}</span>
						<span class="text-green-400 text-xs">+{marketData.bitcoin.changePercent.toFixed(3)}%</span>
					</div>
					<div class="flex items-center justify-between gap-4 border-t border-zinc-600 pt-2">
						<span class="text-zinc-400">Portfolio</span>
						<span class="font-mono">${marketData.portfolio.value.toLocaleString()}</span>
						<span class="text-green-400 text-xs">+{marketData.portfolio.changePercent.toFixed(3)}%</span>
					</div>
				</div>
			</div>
			
			<!-- Chart labels -->
			<div class="absolute top-4 right-4 z-20 bg-black bg-opacity-90 rounded-lg p-4 border border-zinc-700">
				<div class="text-white text-sm space-y-2">
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 bg-green-400 rounded"></span>
						<span>Portfolio Performance</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 bg-blue-500 rounded"></span>
						<span>S&P 500 Index</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 bg-orange-500 rounded"></span>
						<span>Bitcoin Price</span>
					</div>
					<div class="text-xs text-zinc-400 mt-3">
						Real-time market data visualization
					</div>
				</div>
			</div>
			
			<!-- Instructions -->
			<div class="absolute bottom-4 left-4 z-20 bg-black bg-opacity-80 rounded-lg p-3 border border-zinc-700">
				<div class="text-white text-xs">
					<div class="flex items-center gap-2 mb-1">
						<span class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
						<span>Live Market Data</span>
					</div>
					<div class="text-zinc-400">
						Drag to rotate • Scroll to zoom • Auto-updating charts
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>