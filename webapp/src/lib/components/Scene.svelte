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
	position={[6, 8, 7]} 
	fov={50} 
	aspect={window.innerWidth / window.innerHeight} 
	near={0.1} 
	far={10000}
	makeDefault
>
	<OrbitControls enableDamping 
		enablePan={false} 
		autoRotate 
		autoRotateSpeed={0.2} 
		maxAzimuthAngle={Math.PI / 2}
		minAzimuthAngle={0}
		on:change={({target}) => {
			if(target.getAzimuthalAngle() >= (Math.PI / 2)) {
				target.autoRotateSpeed = -target.autoRotateSpeed 
			}
			else if(target.getAzimuthalAngle() <= Number.EPSILON) {
				target.autoRotateSpeed = -target.autoRotateSpeed 
			}
		}}
	/>
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



