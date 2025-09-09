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
	let earthRef = null;
	let cloudsRef = null;
	let sunRef = null;
	let cityLightsRef = null;
	let time = $state(0);

	onMount(() => {
		try {
			isClient = true;
			isLoaded = true;
			startAnimation();
		} catch (error) {
			console.error('RotatingEarth: Error during initialization:', error);
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
			
			// Rotate Earth
			if (earthRef) {
				earthRef.rotation.y = time * 0.5;
			}
			
			// Rotate clouds slightly faster
			if (cloudsRef) {
				cloudsRef.rotation.y = time * 0.6;
			}
			
			// Animate sun position and intensity
			if (sunRef) {
				const sunAngle = time * 0.3;
				sunRef.position.x = Math.cos(sunAngle) * 80;
				sunRef.position.z = Math.sin(sunAngle) * 80;
				sunRef.position.y = Math.sin(sunAngle * 0.5) * 20;
				
				// Adjust sun intensity based on position
				const intensity = Math.max(0.3, Math.sin(sunAngle) * 0.7 + 0.5);
				sunRef.intensity = intensity;
			}
			
			// Animate city lights visibility
			if (cityLightsRef) {
				const nightSide = Math.sin(time * 0.3) < 0;
				cityLightsRef.visible = nightSide;
			}
			
			animationId = requestAnimationFrame(animate);
		}
		animate();
	}

	// Generate starfield
	function generateStars() {
		const starCount = 2000;
		const positions = new Float32Array(starCount * 3);
		const colors = new Float32Array(starCount * 3);
		
		for (let i = 0; i < starCount; i++) {
			// Random positions in a large sphere
			const radius = 200 + Math.random() * 300;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			
			positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
			positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
			positions[i * 3 + 2] = radius * Math.cos(phi);
			
			// Star colors (mostly white with some blue/red stars)
			const colorVariation = Math.random();
			if (colorVariation < 0.1) {
				colors[i * 3] = 0.8; // Red
				colors[i * 3 + 1] = 0.4;
				colors[i * 3 + 2] = 0.4;
			} else if (colorVariation < 0.2) {
				colors[i * 3] = 0.6; // Blue
				colors[i * 3 + 1] = 0.7;
				colors[i * 3 + 2] = 1.0;
			} else {
				colors[i * 3] = 1.0; // White
				colors[i * 3 + 1] = 1.0;
				colors[i * 3 + 2] = 1.0;
			}
		}
		
		return { positions, colors };
	}

	// Generate city lights
	function generateCityLights() {
		const lightCount = 500;
		const positions = new Float32Array(lightCount * 3);
		const colors = new Float32Array(lightCount * 3);
		
		for (let i = 0; i < lightCount; i++) {
			// Random positions on Earth surface
			const radius = 10.1;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			
			positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
			positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
			positions[i * 3 + 2] = radius * Math.cos(phi);
			
			// City light colors (warm yellow/orange)
			colors[i * 3] = 1.0;
			colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
			colors[i * 3 + 2] = 0.3 + Math.random() * 0.3;
		}
		
		return { positions, colors };
	}

	const { positions: starPositions, colors: starColors } = generateStars();
	const { positions: cityPositions, colors: cityColors } = generateCityLights();
</script>

<div class="relative w-full h-full">
	{#if !browser}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
				<p class="text-lg text-white mb-2">Rotating Earth</p>
				<p class="text-sm text-zinc-400">This component requires a browser environment</p>
			</div>
		</div>
	{:else if !isClient}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-green-400 border-t-transparent animate-spin mx-auto mb-4"></div>
				<p class="text-lg text-white mb-2">Initializing Earth</p>
				<p class="text-sm text-zinc-400">Loading 3D components...</p>
			</div>
		</div>
	{:else if hasError}
		<div class="w-full h-full bg-black p-4 overflow-auto">
			<div class="text-center text-white mb-4">
				<h2 class="text-xl font-bold mb-2">Earth Visualization</h2>
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
				<p class="text-lg text-white mb-2">Loading Earth</p>
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
						console.error('RotatingEarth: Error configuring renderer:', error);
						hasError = true;
						errorMessage = `Renderer error: ${error.message}`;
					}
				}}
				onerror={(error) => {
					console.error('RotatingEarth: Canvas error:', error);
					hasError = true;
					errorMessage = `Canvas error: ${error.message || 'Unknown error'}`;
				}}
				gl={{ 
					antialias: true,
					alpha: false
				}}
			>
				<!-- Deep space background -->
				<T.Color attach="background" args={['#000008']} />
				
				<!-- Ambient lighting for subtle illumination -->
				<T.AmbientLight intensity={0.1} color="#ffffff" />
				
				<!-- Dynamic sun light -->
				<T.DirectionalLight 
					bind:ref={sunRef}
					position={[80, 20, 0]} 
					intensity={0.8} 
					color="#ffaa44"
					castShadow={true}
				/>
				
				<!-- Additional fill light -->
				<T.DirectionalLight position={[-20, 10, -10]} intensity={0.2} color="#4a90e2" />
				
				<!-- Stars background -->
				<T.Points>
					<T.BufferGeometry>
						<T.BufferAttribute
							attach="attributes.position"
							args={[starPositions, 3]}
						/>
						<T.BufferAttribute
							attach="attributes.color"
							args={[starColors, 3]}
						/>
					</T.BufferGeometry>
					<T.PointsMaterial
						size={1.5}
						sizeAttenuation={true}
						transparent={true}
						opacity={0.8}
						vertexColors={true}
					/>
				</T.Points>
				
				<!-- Earth sphere with stylized appearance -->
				<T.Mesh bind:ref={earthRef} position={[0, 0, 0]}>
					<T.SphereGeometry args={[10, 64, 64]} />
					<T.MeshStandardMaterial
						color="#1e3a8a"
						emissive="#0f172a"
						emissiveIntensity={0.05}
						metalness={0.1}
						roughness={0.9}
						wireframe={false}
					/>
				</T.Mesh>
				
				<!-- Stylized land masses with height variations -->
				<!-- North America -->
				<T.Mesh position={[0, 7, -7]}>
					<T.SphereGeometry args={[3.2, 16, 16]} />
					<T.MeshStandardMaterial
						color="#8B7355"
						emissive="#4a3c2a"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.8}
					/>
				</T.Mesh>
				
				<!-- North America - Mountain ranges -->
				<T.Mesh position={[0, 7.5, -6.8]}>
					<T.SphereGeometry args={[3.4, 12, 12]} />
					<T.MeshStandardMaterial
						color="#6B5B47"
						emissive="#3a2c1a"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.9}
					/>
				</T.Mesh>
				
				<!-- South America -->
				<T.Mesh position={[0, -3, -8]}>
					<T.SphereGeometry args={[2.7, 14, 14]} />
					<T.MeshStandardMaterial
						color="#8B7355"
						emissive="#4a3c2a"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.8}
					/>
				</T.Mesh>
				
				<!-- Andes Mountains -->
				<T.Mesh position={[0, -2.8, -7.7]}>
					<T.SphereGeometry args={[2.9, 10, 10]} />
					<T.MeshStandardMaterial
						color="#6B5B47"
						emissive="#3a2c1a"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.9}
					/>
				</T.Mesh>
				
				<!-- Europe/Asia -->
				<T.Mesh position={[0, 7, 7]}>
					<T.SphereGeometry args={[4.2, 16, 16]} />
					<T.MeshStandardMaterial
						color="#8B7355"
						emissive="#4a3c2a"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.8}
					/>
				</T.Mesh>
				
				<!-- Himalayas -->
				<T.Mesh position={[0, 7.5, 7.2]}>
					<T.SphereGeometry args={[4.4, 12, 12]} />
					<T.MeshStandardMaterial
						color="#6B5B47"
						emissive="#3a2c1a"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.9}
					/>
				</T.Mesh>
				
				<!-- Africa -->
				<T.Mesh position={[0, 0, 7]}>
					<T.SphereGeometry args={[3.2, 14, 14]} />
					<T.MeshStandardMaterial
						color="#8B7355"
						emissive="#4a3c2a"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.8}
					/>
				</T.Mesh>
				
				<!-- Atlas Mountains -->
				<T.Mesh position={[0, 0.5, 7.1]}>
					<T.SphereGeometry args={[3.4, 10, 10]} />
					<T.MeshStandardMaterial
						color="#6B5B47"
						emissive="#3a2c1a"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.9}
					/>
				</T.Mesh>
				
				<!-- Australia -->
				<T.Mesh position={[0, -6, 9]}>
					<T.SphereGeometry args={[2.2, 12, 12]} />
					<T.MeshStandardMaterial
						color="#8B7355"
						emissive="#4a3c2a"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.8}
					/>
				</T.Mesh>
				
				<!-- Greenland -->
				<T.Mesh position={[0, 9, -5]}>
					<T.SphereGeometry args={[1.7, 8, 8]} />
					<T.MeshStandardMaterial
						color="#8B7355"
						emissive="#4a3c2a"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.8}
					/>
				</T.Mesh>
				
				<!-- Antarctica -->
				<T.Mesh position={[0, -9, 0]}>
					<T.SphereGeometry args={[2.7, 12, 12]} />
					<T.MeshStandardMaterial
						color="#ffffff"
						emissive="#e0e0e0"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.9}
					/>
				</T.Mesh>
				
				<!-- Special terrain features -->
				<!-- Sahara Desert -->
				<T.Mesh position={[0, 2, 7]}>
					<T.SphereGeometry args={[2.2, 10, 10]} />
					<T.MeshStandardMaterial
						color="#D2B48C"
						emissive="#B8946F"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.9}
					/>
				</T.Mesh>
				
				<!-- Amazon Rainforest -->
				<T.Mesh position={[0, -2, -8]}>
					<T.SphereGeometry args={[2.2, 10, 10]} />
					<T.MeshStandardMaterial
						color="#228B22"
						emissive="#1a5a1a"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.8}
					/>
				</T.Mesh>
				
				<!-- Siberian Tundra -->
				<T.Mesh position={[0, 8, 7]}>
					<T.SphereGeometry args={[2.7, 10, 10]} />
					<T.MeshStandardMaterial
						color="#8FBC8F"
						emissive="#6a9a6a"
						emissiveIntensity={0.1}
						metalness={0.0}
						roughness={0.9}
					/>
				</T.Mesh>
				
				<!-- Animated cloud layer -->
				<T.Mesh bind:ref={cloudsRef} position={[0, 0, 0]}>
					<T.SphereGeometry args={[10.1, 32, 32]} />
					<T.MeshBasicMaterial
						color="#ffffff"
						transparent={true}
						opacity={0.3}
						wireframe={false}
					/>
				</T.Mesh>
				
				<!-- Additional cloud formations -->
				<T.Mesh position={[0, 0, 0]}>
					<T.SphereGeometry args={[10.15, 24, 24]} />
					<T.MeshBasicMaterial
						color="#ffffff"
						transparent={true}
						opacity={0.2}
						wireframe={false}
					/>
				</T.Mesh>
				
				<!-- City lights on the dark side -->
				<T.Points bind:ref={cityLightsRef}>
					<T.BufferGeometry>
						<T.BufferAttribute
							attach="attributes.position"
							args={[cityPositions, 3]}
						/>
						<T.BufferAttribute
							attach="attributes.color"
							args={[cityColors, 3]}
						/>
					</T.BufferGeometry>
					<T.PointsMaterial
						size={0.8}
						sizeAttenuation={true}
						transparent={true}
						opacity={0.9}
						vertexColors={true}
					/>
				</T.Points>
				
				<!-- Earth atmosphere glow -->
				<T.Mesh position={[0, 0, 0]}>
					<T.SphereGeometry args={[10.3, 32, 32]} />
					<T.MeshBasicMaterial
						color="#4a90e2"
						transparent={true}
						opacity={0.1}
					/>
				</T.Mesh>
				
				<!-- Camera setup for low Earth orbit view -->
				<T.PerspectiveCamera
					position={[0, 8, 20]}
					fov={60}
					aspect={typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 16 / 9}
					near={0.1}
					far={1000}
					makeDefault
				>
					<OrbitControls
						enableDamping
						dampingFactor={0.05}
						enablePan={false}
						enableZoom={true}
						enableRotate={true}
						autoRotate={false}
						minDistance={15}
						maxDistance={40}
						minPolarAngle={Math.PI / 6}
						maxPolarAngle={Math.PI / 2.5}
					/>
				</T.PerspectiveCamera>
			</Canvas>
			
			<!-- Info overlay -->
			<div class="absolute top-4 left-4 z-20 bg-black bg-opacity-80 rounded-lg p-4 border border-zinc-700">
				<div class="text-white text-sm">
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 bg-blue-400 rounded-full"></span>
						<span>Ocean</span>
					</div>
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 bg-amber-600 rounded-full"></span>
						<span>Land</span>
					</div>
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 bg-white rounded-full opacity-30"></span>
						<span>Clouds</span>
					</div>
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 bg-yellow-400 rounded-full"></span>
						<span>City Lights</span>
					</div>
					<div class="text-xs text-zinc-400 mt-2">
						Drag to rotate • Scroll to zoom • Auto-rotating Earth
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>