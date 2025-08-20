<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { T } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import { gsap } from 'gsap';
	import HeatmapColumns from './HeatmapColumns.svelte';
	import HeatmapGrid from './HeatmapGrid.svelte';

	const { sp500Data } = $props();
	const dispatch = createEventDispatcher();

	let camera = null;
	let scene = null;
	let animationTimeline = null;
	let isSceneReady = false;

	// Watch for data changes
	$effect(() => {
		console.log('HeatmapScene: Data changed:', sp500Data);
		console.log('HeatmapScene: Data length:', sp500Data?.length);
	});

	onMount(() => {
		try {
			console.log('HeatmapScene: Component mounted with data:', sp500Data);
			
			// Wait for camera to be available before setting up animations
			const setupAnimations = () => {
				if (!camera || !camera.position) {
					console.warn('HeatmapScene: Camera not ready, retrying...');
					setTimeout(setupAnimations, 100);
					return;
				}

				try {
					// Create animation timeline for camera movement
					animationTimeline = gsap.timeline({ repeat: -1, yoyo: true });

					// Animate camera to show positive changes (green columns)
					animationTimeline.to(camera.position, {
						x: 15,
						y: 20,
						z: 15,
						duration: 15,
						ease: 'power2.inOut'
					});

					// Animate camera to show negative changes (red columns) - look down from above
					animationTimeline.to(camera.position, {
						x: -15,
						y: 25,
						z: 15,
						duration: 15,
						ease: 'power2.inOut'
					});

					// Animate camera to show negative bars from below - look up at negative bars
					animationTimeline.to(camera.position, {
						x: 0,
						y: -15,
						z: 25,
						duration: 15,
						ease: 'power2.inOut'
					});

					// Return to center view
					animationTimeline.to(camera.position, {
						x: 0,
						y: 10,
						z: 25,
						duration: 10,
						ease: 'power2.inOut'
					});

					console.log('HeatmapScene: Animations set up successfully');
				} catch (error) {
					console.error('HeatmapScene: Error setting up animations:', error);
				}
			};

			// Start setting up animations after a short delay
			setTimeout(setupAnimations, 200);

			// Mark scene as ready after a short delay to ensure all components are loaded
			setTimeout(() => {
				isSceneReady = true;
				dispatch('sceneReady');
				console.log('HeatmapScene: Scene ready event dispatched');
			}, 500);
		} catch (error) {
			console.error('HeatmapScene: Error during setup:', error);
			dispatch('error', error.message);
		}
	});

	onDestroy(() => {
		if (animationTimeline) {
			animationTimeline.kill();
		}
	});
</script>

<!-- Camera setup -->
<T.PerspectiveCamera
	position={[0, 20, 40]}
	fov={60}
	aspect={typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 16 / 9}
	near={0.1}
	far={1000}
	makeDefault
	oncreate={(ref) => {
		try {
			camera = ref;
			if (ref && ref.position) {
				ref.lookAt(0, 0, 0);
				console.log('HeatmapScene: Camera created successfully at position:', ref.position);
			} else {
				console.warn('HeatmapScene: Camera ref or position is undefined');
			}
		} catch (error) {
			console.error('HeatmapScene: Error setting up camera:', error);
		}
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
		minDistance={10}
		maxDistance={100}
	/>
</T.PerspectiveCamera>

<!-- Lighting setup for futuristic neon theme -->
<T.AmbientLight intensity={0.6} color="#ffffff" />

<!-- Main directional light with neon green tint -->
<T.DirectionalLight
	position={[20, 30, 20]}
	color="#00ff88"
	intensity={1.5}
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
<T.DirectionalLight position={[-20, 20, -20]} color="#0088ff" intensity={1.0} />

<!-- Point light for dramatic effect -->
<T.PointLight position={[0, 15, 0]} color="#ffffff" intensity={0.8} distance={50} />

<!-- Additional fill light from below -->
<T.DirectionalLight position={[0, -10, 0]} color="#ffffff" intensity={0.6} />

<!-- Additional light from below to illuminate negative bars -->
<T.PointLight position={[0, -5, 0]} color="#ffffff" intensity={0.5} distance={30} />

<!-- Additional light from below to illuminate negative bars -->
<T.SpotLight 
	position={[0, -8, 0]} 
	color="#ffffff" 
	intensity={0.4} 
	distance={40}
	angle={Math.PI / 3}
	penumbra={0.5}
	target={[0, 0, 0]}
/>

<!-- Fog for depth and atmosphere -->
<T.Fog attach="fog" args={['#000000', 80, 200]} />

<!-- Grid plane -->
<HeatmapGrid />

<!-- Simple test cube to verify 3D rendering -->
<T.Mesh position={[0, 10, 0]}>
	<T.BoxGeometry args={[3, 3, 3]} />
	<T.MeshStandardMaterial
		color="#ffff00"
		emissive="#ffff00"
		emissiveIntensity={0.8}
		metalness={0.3}
		roughness={0.7}
	/>
</T.Mesh>

<!-- 3D Columns representing the heatmap data -->
<HeatmapColumns {sp500Data} />
