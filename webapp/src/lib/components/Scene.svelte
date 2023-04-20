<script>
	import { 
		OrbitControls, 
		PerspectiveCamera, 
		AmbientLight, 
		DirectionalLight,
		useFrame
	} from '@threlte/core'
	import { GLTF, Float } from '@threlte/extras'
	import model from '$lib/assets/models/monitors.glb'

	let rotation = 0

	useFrame(() => {
	})

</script>

<PerspectiveCamera position={{ x: -1400, y: 0, z: 0 }} lookAt= {{x:0, y:0, z:0 }}  fov={45}>
	<OrbitControls enableDamping/>
</PerspectiveCamera>

<DirectionalLight position={{ x: -1000, y: 100, z: 200 }} target={{ x: 0, y: 0, z: 0 }} 
	color={0x39FF14}
	intensity={0.6}
/>

<AmbientLight intensity={0.2} />
<Float speed={2}>
	<GLTF 
	position={{x: 0, y: 50, z:60 }} 
	url={model} 
	useDraco={true} 
	interactive 
	on:click={() => {
		console.log('user clicked')
	}} 
	/>
</Float>
