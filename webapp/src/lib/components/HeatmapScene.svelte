<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { T } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import HeatmapColumns from './HeatmapColumns.svelte';
	import HeatmapGrid from './HeatmapGrid.svelte';

	const { sp500Data } = $props();
	const dispatch = createEventDispatcher();

	let isSceneReady = false;

	onMount(() => {
		try {
			console.log('HeatmapScene: Component mounted with data:', sp500Data);
			
			// Mark scene as ready after a short delay
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
		autoRotate={false}
		minDistance={10}
		maxDistance={100}
	/>
</T.PerspectiveCamera>

<!-- Lighting setup -->
<T.AmbientLight intensity={0.6} color="#ffffff" />
<T.DirectionalLight position={[20, 30, 20]} color="#00ff88" intensity={1.0} />

<!-- Grid plane -->
<HeatmapGrid />

<!-- 3D Columns representing the heatmap data -->
<HeatmapColumns {sp500Data} />
