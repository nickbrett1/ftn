<script>
	import { T, useFrame } from '@threlte/core'
	import { GLTF, OrbitControls, interactivity } from '@threlte/extras'
	import model from '$lib/assets/models/office.glb'

	interactivity()

	let rotation = 0
	useFrame(() => {
	})

</script>

<T.PerspectiveCamera 
	position={[6, 8, 9]} 
	fov={50} 
	aspect={window.innerWidth / window.innerHeight} 
	near={0.1} 
	far={10000}
	makeDefault>
	<OrbitControls enableDamping autoRotate autoRotateSpeed={0.2} />
</T.PerspectiveCamera>

<T.DirectionalLight 
	position={[6, 8, 9]} 
	color="white"
	intensity={0.6}
/>

<T.AmbientLight intensity={0.2} />

<GLTF url={model}
	useDraco={true}
	on:load={({materials, nodes}) => { 
		console.log('nodes', nodes)
		console.log('materials', materials)
	}} />



