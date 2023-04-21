<script>
	import { 
		OrbitControls, 
		PerspectiveCamera, 
		AmbientLight, 
		DirectionalLight,
		Object3DInstance,
		useFrame,
	} from '@threlte/core'
	import { GLTF, Float, useGltf } from '@threlte/extras'
	import model from '$lib/assets/models/monitors.glb'

	const { gltf } = useGltf(model, {
		useDraco: true
	});

	let rotation = 0
		useFrame(() => {
	})

</script>



<PerspectiveCamera position={{ x: -1400, y: 0, z: 0 }} lookAt= {{x:0, y:0, z:0 }}  fov={45}>
	<OrbitControls enableDamping/>
</PerspectiveCamera>

<DirectionalLight position={{ x: -1000, y: 100, z: 200 }} target={{ x: 0, y: 0, z: 0 }} 
	color={0x50C878}
	intensity={0.6}
/>

<AmbientLight intensity={0.2} />

{#if $gltf}
<Float>
  <Object3DInstance object={$gltf.nodes['Left']} position={{x: -95, y: 115, z:-10 }}    />
  <Object3DInstance object={$gltf.nodes['Middle']} position={{x: -95, y: 115, z:-10 }} />
  <Object3DInstance object={$gltf.nodes['Right']} position={{x: -95, y: 115, z:-10 }} />
  <Object3DInstance object={$gltf.nodes['Stand']} position={{x: -95, y: 115, z:-10 }} />
</Float>
{/if}


