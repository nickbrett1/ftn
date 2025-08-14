<script>
	import { onMount, onDestroy } from 'svelte';
	import { T } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import { gsap } from 'gsap';
	import HeatmapColumns from './HeatmapColumns.svelte';
	import HeatmapGrid from './HeatmapGrid.svelte';

	const { sp500Data } = $props();

	let camera = $state();
	let scene = $state();
	let animationTimeline = $state();
	let aspectRatio = $state(16/9); // Default aspect ratio

	onMount(() => {
		// Set aspect ratio safely
		if (typeof window !== 'undefined') {
			aspectRatio = window.innerWidth / window.innerHeight;
		}

		// Create animation timeline for camera movement
		animationTimeline = gsap.timeline({ repeat: -1, yoyo: true });
		
		// Animate camera to show positive changes (green columns)
		animationTimeline.to(camera.position, { 
			x: 15, y: 20, z: 15, 
			duration: 15, 
			ease: 'power2.inOut' 
		});
		
		// Animate camera to show negative changes (red columns)
		animationTimeline.to(camera.position, { 
			x: -15, y: -20, z: 15, 
			duration: 15, 
			ease: 'power2.inOut' 
		});
		
		// Return to center view
		animationTimeline.to(camera.position, { 
			x: 0, y: 10, z: 25, 
			duration: 10, 
			ease: 'power2.inOut' 
		});
	});

	onDestroy(() => {
		if (animationTimeline) {
			animationTimeline.kill();
		}
	});
</script>

<!-- Camera setup -->
<T.PerspectiveCamera
	position={[0, 10, 25]}
	fov={45}
	aspect={aspectRatio}
	near={0.1}
	far={1000}
	makeDefault
	oncreate={(ref) => {
		camera = ref;
		ref.lookAt(0, 0, 0);
	}}
>
	<OrbitControls 
		enableDamping 
		dampingFactor={0.05}
		enablePan={true}
		enableZoom={true}
		enableRotate={true}
		autoRotate={true}
		autoRotateSpeed={0.5}
	/>
</T.PerspectiveCamera>

<!-- Lighting setup for futuristic neon theme -->
<T.AmbientLight intensity={0.1} color="#0a0a0a" />

<!-- Main directional light with neon green tint -->
<T.DirectionalLight 
	position={[20, 30, 20]} 
	color="#00ff88" 
	intensity={0.8}
	castShadow
	shadow-mapSize-width={2048}
	shadow-mapSize-height={2048}
	shadow-camera-far={100}
	shadow-camera-left={-20}
	shadow-camera-right={20}
	shadow-camera-top={20}
	shadow-camera-bottom={-20}
/>

<!-- Secondary light with blue tint for contrast -->
<T.DirectionalLight 
	position={[-20, 20, -20]} 
	color="#0088ff" 
	intensity={0.4}
/>

<!-- Point light for dramatic effect -->
<T.PointLight 
	position={[0, 15, 0]} 
	color="#ffffff" 
	intensity={0.3}
	distance={50}
/>

<!-- Fog for depth and atmosphere -->
<T.Fog attach="fog" args={['#000000', 30, 100]} />

<!-- Grid plane -->
<HeatmapGrid />

<!-- 3D Columns representing the heatmap data -->
<HeatmapColumns sp500Data={sp500Data} />