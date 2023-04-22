<script>
	import { T, useFrame } from '@threlte/core'
	import { Float, OrbitControls, useGltf, interactivity } from '@threlte/extras'
	import model from '$lib/assets/models/monitors.glb'

	interactivity()

	const gltf  = useGltf(model, {
		useDraco: true
	});

	let rotation = 0
	useFrame(() => {
	})

</script>

<T.PerspectiveCamera 
	position={[-1400, 0, 0]} 
	rotation={[0, 0, 0]} 
	fov={50} 
	aspect={window.innerWidth / window.innerHeight} 
	near={0.1} 
	far={10000}
	makeDefault>
	<OrbitControls enableDamping enableZoom={false}/>
</T.PerspectiveCamera>

<T.DirectionalLight 
	position={[-1000, 100, 200 ]} 
	color="#50C878"
	intensity={0.6}
/>

<T.AmbientLight intensity={0.2} />

{#if $gltf}
<Float f
	floatIntensity={5}   
	rotationIntensity={1}
  rotationSpeed={[0.5, 0.5, 0.5]}>
	<T is={$gltf.nodes['Left'] }  
		position={[-95, 115, -10] }   
		on:click={(e) => {
			e.stopPropagation()
    console.log('left clicked')
  }}/>
	<T is={$gltf.nodes['Middle'] } 
		position={[-95, 115, -10] } 
		on:click={(e) => {
			e.stopPropagation()
    console.log('middle clicked')
  }} />
	<T is={$gltf.nodes['Right'] } 
		position={[-95, 115, -10] } 
		on:click={(e) => {
			e.stopPropagation()
    console.log('right clicked')
  }} />
	<T is={$gltf.nodes['Stand'] } position={[-95, 115, -10] } />
</Float>
{/if}


