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
	let hoveredComponent = $state(null);

	// Tech stack components with their positions and properties
	const techComponents = [
		// Frontend Layer
		{
			id: 'sveltekit',
			name: 'SvelteKit 5',
			category: 'Frontend',
			position: [0, 8, 0],
			color: '#ff3e00',
			description: 'Reactive, performant UI framework',
			features: ['Reactive Stores', 'Component Library', 'Code Splitting']
		},
		{
			id: 'tailwind',
			name: 'TailwindCSS 4',
			category: 'Styling',
			position: [-3, 8, 2],
			color: '#06b6d4',
			description: 'Utility-first CSS framework',
			features: ['Custom Design System', 'Responsive Design', 'Performance Optimized']
		},
		{
			id: 'typescript',
			name: 'TypeScript',
			category: 'Language',
			position: [3, 8, 2],
			color: '#3178c6',
			description: 'Type-safe JavaScript development',
			features: ['Type Safety', 'IntelliSense', 'Modern ES Features']
		},

		// Backend Layer
		{
			id: 'cloudflare-workers',
			name: 'Cloudflare Workers',
			category: 'Backend',
			position: [0, 4, 0],
			color: '#f38020',
			description: 'Edge computing platform',
			features: ['Global Edge Distribution', 'Serverless Functions', 'Zero Cold Start']
		},
		{
			id: 'd1',
			name: 'Cloudflare D1',
			category: 'Database',
			position: [-4, 4, 0],
			color: '#ff6b35',
			description: 'Serverless SQLite database',
			features: ['ACID Compliance', 'Global Replication', 'SQLite Compatible']
		},
		{
			id: 'r2',
			name: 'Cloudflare R2',
			category: 'Storage',
			position: [4, 4, 0],
			color: '#ff6b35',
			description: 'Object storage platform',
			features: ['S3 Compatible', 'Zero Egress Fees', 'Global CDN']
		},

		// Data & Analytics Layer
		{
			id: 'dbt',
			name: 'dbt',
			category: 'Data Pipeline',
			position: [-2, 0, 3],
			color: '#ff6944',
			description: 'Data transformation workflows',
			features: ['SQL Transformations', 'Version Control', 'Testing Framework']
		},
		{
			id: 'duckdb',
			name: 'DuckDB',
			category: 'Analytics',
			position: [2, 0, 3],
			color: '#fff000',
			description: 'In-process analytical database',
			features: ['Columnar Storage', 'SQL Interface', 'High Performance']
		},
		{
			id: 'apexcharts',
			name: 'ApexCharts',
			category: 'Visualization',
			position: [0, 0, 4],
			color: '#008ffb',
			description: 'Interactive financial dashboards',
			features: ['Real-time Updates', 'Responsive Design', 'Rich Animations']
		},

		// DevOps & Infrastructure
		{
			id: 'circleci',
			name: 'CircleCI',
			category: 'CI/CD',
			position: [-3, -4, 2],
			color: '#343434',
			description: 'Continuous integration pipeline',
			features: ['Automated Testing', 'Security Scanning', 'Preview Deployments']
		},
		{
			id: 'sonarcloud',
			name: 'SonarCloud',
			category: 'Quality',
			position: [0, -4, 3],
			color: '#4e9eff',
			description: 'Code quality monitoring',
			features: ['Coverage Reporting', 'Security Analysis', 'Technical Debt']
		},
		{
			id: 'lighthouse',
			name: 'Lighthouse CI',
			category: 'Performance',
			position: [3, -4, 2],
			color: '#f7b731',
			description: 'Performance monitoring',
			features: ['Core Web Vitals', 'Accessibility', 'SEO Analysis']
		},

		// AI & ML Layer
		{
			id: 'llm',
			name: 'LLM Integration',
			category: 'AI',
			position: [0, -8, 0],
			color: '#8b5cf6',
			description: 'AI-powered data processing',
			features: ['Natural Language', 'Document Analysis', 'Smart Automation']
		}
	];

	// Connections between components
	const connections = [
		// Frontend connections
		{ from: 'sveltekit', to: 'tailwind' },
		{ from: 'sveltekit', to: 'typescript' },
		{ from: 'sveltekit', to: 'cloudflare-workers' },
		
		// Backend connections
		{ from: 'cloudflare-workers', to: 'd1' },
		{ from: 'cloudflare-workers', to: 'r2' },
		{ from: 'cloudflare-workers', to: 'dbt' },
		
		// Data connections
		{ from: 'dbt', to: 'duckdb' },
		{ from: 'duckdb', to: 'apexcharts' },
		{ from: 'apexcharts', to: 'sveltekit' },
		
		// DevOps connections
		{ from: 'circleci', to: 'sonarcloud' },
		{ from: 'sonarcloud', to: 'lighthouse' },
		{ from: 'lighthouse', to: 'sveltekit' },
		
		// AI connections
		{ from: 'llm', to: 'cloudflare-workers' },
		{ from: 'llm', to: 'dbt' }
	];

	onMount(() => {
		try {
			isClient = true;
			isLoaded = true;
			startAnimation();
		} catch (error) {
			console.error('TechStackArchitecture: Error during initialization:', error);
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
			animationId = requestAnimationFrame(animate);
		}
		animate();
	}

	function getComponentById(id) {
		return techComponents.find(comp => comp.id === id);
	}

	function handleComponentHover(componentId) {
		hoveredComponent = componentId;
	}

	function handleComponentLeave() {
		hoveredComponent = null;
	}
</script>

<div class="relative w-full h-full">
	{#if !browser}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
				<p class="text-lg text-white mb-2">Tech Stack Architecture</p>
				<p class="text-sm text-zinc-400">This component requires a browser environment</p>
			</div>
		</div>
	{:else if !isClient}
		<div class="absolute inset-0 w-full h-full flex flex-col gap-4 justify-center items-center bg-black bg-opacity-90 z-10">
			<div class="text-center">
				<div class="w-16 h-16 border-4 border-green-400 border-t-transparent animate-spin mx-auto mb-4"></div>
				<p class="text-lg text-white mb-2">Initializing Architecture</p>
				<p class="text-sm text-zinc-400">Loading 3D components...</p>
			</div>
		</div>
	{:else if hasError}
		<div class="w-full h-full bg-black p-4 overflow-auto">
			<div class="text-center text-white mb-4">
				<h2 class="text-xl font-bold mb-2">Tech Stack Visualization</h2>
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
				<p class="text-lg text-white mb-2">Loading Architecture</p>
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
						console.error('TechStackArchitecture: Error configuring renderer:', error);
						hasError = true;
						errorMessage = `Renderer error: ${error.message}`;
					}
				}}
				onerror={(error) => {
					console.error('TechStackArchitecture: Canvas error:', error);
					hasError = true;
					errorMessage = `Canvas error: ${error.message || 'Unknown error'}`;
				}}
				gl={{ 
					antialias: true,
					alpha: false
				}}
			>
				<!-- Dark gradient background -->
				<T.Color attach="background" args={['#0a0a0f']} />
				
				<!-- Ambient lighting for subtle illumination -->
				<T.AmbientLight intensity={0.3} color="#ffffff" />
				
				<!-- Main directional light -->
				<T.DirectionalLight position={[10, 10, 5]} intensity={0.8} color="#ffffff" />
				
				<!-- Accent lighting -->
				<T.PointLight position={[0, 0, 10]} intensity={0.5} color="#4f46e5" distance={50} />
				<T.PointLight position={[0, 0, -10]} intensity={0.3} color="#06b6d4" distance={50} />
				
				<!-- Animated connections between components -->
				{#each connections as connection}
					{@const fromComp = getComponentById(connection.from)}
					{@const toComp = getComponentById(connection.to)}
					{#if fromComp && toComp}
						<T.Line>
							<T.BufferGeometry>
								<T.BufferAttribute
									attach="attributes.position"
									args={[
										new Float32Array([
											fromComp.position[0], fromComp.position[1], fromComp.position[2],
											toComp.position[0], toComp.position[1], toComp.position[2]
										]),
										3
									]}
								/>
							</T.BufferGeometry>
							<T.LineBasicMaterial
								color="#4f46e5"
								transparent={true}
								opacity={0.6}
								linewidth={2}
							/>
						</T.Line>
						
						<!-- Animated particles along the connection -->
						<T.Points>
							<T.BufferGeometry>
								<T.BufferAttribute
									attach="attributes.position"
									args={[
										new Float32Array([
											// Generate particles along the line
											...Array.from({ length: 5 }, (_, i) => {
												const t = (i / 4) + (time * 0.5) % 1;
												const x = fromComp.position[0] + (toComp.position[0] - fromComp.position[0]) * t;
												const y = fromComp.position[1] + (toComp.position[1] - fromComp.position[1]) * t;
												const z = fromComp.position[2] + (toComp.position[2] - fromComp.position[2]) * t;
												return [x, y, z];
											}).flat()
										]),
										3
									]}
								/>
							</T.BufferGeometry>
							<T.PointsMaterial
								color="#06b6d4"
								size={0.3}
								sizeAttenuation={true}
								transparent={true}
								opacity={0.8}
							/>
						</T.Points>
					{/if}
				{/each}
				
				<!-- Tech stack components -->
				{#each techComponents as component}
					<T.Mesh 
						position={component.position}
						onpointerenter={() => handleComponentHover(component.id)}
						onpointerleave={() => handleComponentLeave()}
					>
						<T.BoxGeometry args={[2, 1.5, 0.5]} />
						<T.MeshStandardMaterial
							color={component.color}
							emissive={component.color}
							emissiveIntensity={hoveredComponent === component.id ? 0.3 : 0.1}
							metalness={0.2}
							roughness={0.3}
						/>
					</T.Mesh>
					
					<!-- Component label -->
					<T.Mesh position={[component.position[0], component.position[1] - 1.2, component.position[2]]}>
						<T.PlaneGeometry args={[3, 0.8]} />
						<T.MeshBasicMaterial
							color="#ffffff"
							transparent={true}
							opacity={0.9}
						/>
					</T.Mesh>
					
					<!-- Glow effect for hovered component -->
					{#if hoveredComponent === component.id}
						<T.Mesh position={component.position}>
							<T.BoxGeometry args={[2.5, 2, 1]} />
							<T.MeshBasicMaterial
								color={component.color}
								transparent={true}
								opacity={0.2}
							/>
						</T.Mesh>
					{/if}
				{/each}
				
				<!-- Layer labels -->
				<T.Mesh position={[0, 8, -4]}>
					<T.PlaneGeometry args={[8, 1]} />
					<T.MeshBasicMaterial
						color="#1e40af"
						transparent={true}
						opacity={0.8}
					/>
				</T.Mesh>
				
				<T.Mesh position={[0, 4, -4]}>
					<T.PlaneGeometry args={[8, 1]} />
					<T.MeshBasicMaterial
						color="#dc2626"
						transparent={true}
						opacity={0.8}
					/>
				</T.Mesh>
				
				<T.Mesh position={[0, 0, -4]}>
					<T.PlaneGeometry args={[8, 1]} />
					<T.MeshBasicMaterial
						color="#059669"
						transparent={true}
						opacity={0.8}
					/>
				</T.Mesh>
				
				<T.Mesh position={[0, -4, -4]}>
					<T.PlaneGeometry args={[8, 1]} />
					<T.MeshBasicMaterial
						color="#7c3aed"
						transparent={true}
						opacity={0.8}
					/>
				</T.Mesh>
				
				<T.Mesh position={[0, -8, -4]}>
					<T.PlaneGeometry args={[8, 1]} />
					<T.MeshBasicMaterial
						color="#db2777"
						transparent={true}
						opacity={0.8}
					/>
				</T.Mesh>
				
				<!-- Camera setup -->
				<T.PerspectiveCamera
					position={[0, 0, 20]}
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
						minDistance={15}
						maxDistance={40}
					/>
				</T.PerspectiveCamera>
			</Canvas>
			
			<!-- Component details overlay -->
			{#if hoveredComponent}
				{@const component = techComponents.find(c => c.id === hoveredComponent)}
				{#if component}
					<div class="absolute top-4 right-4 z-20 bg-black bg-opacity-90 rounded-lg p-6 border border-zinc-700 max-w-sm">
						<div class="text-white">
							<div class="flex items-center gap-3 mb-3">
								<div class="w-4 h-4 rounded" style="background-color: {component.color}"></div>
								<h3 class="text-xl font-bold">{component.name}</h3>
							</div>
							<p class="text-sm text-zinc-300 mb-3">{component.description}</p>
							<div class="text-xs text-zinc-400 mb-2">Key Features:</div>
							<ul class="text-xs text-zinc-300 space-y-1">
								{#each component.features as feature}
									<li class="flex items-center gap-2">
										<span class="w-1 h-1 bg-blue-400 rounded-full"></span>
										{feature}
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/if}
			{/if}
			
			<!-- Layer legend -->
			<div class="absolute bottom-4 left-4 z-20 bg-black bg-opacity-80 rounded-lg p-4 border border-zinc-700">
				<div class="text-white text-sm">
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 bg-blue-600 rounded"></span>
						<span>Frontend Layer</span>
					</div>
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 bg-red-600 rounded"></span>
						<span>Backend Layer</span>
					</div>
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 bg-green-600 rounded"></span>
						<span>Data & Analytics</span>
					</div>
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 bg-purple-600 rounded"></span>
						<span>DevOps & Infrastructure</span>
					</div>
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 bg-pink-600 rounded"></span>
						<span>AI & ML Layer</span>
					</div>
					<div class="text-xs text-zinc-400 mt-3">
						Hover over components for details • Drag to rotate • Scroll to zoom
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>