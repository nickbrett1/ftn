<script>
	import { 
		Canvas, 
		OrbitControls, 
		PerspectiveCamera, 
		AmbientLight, 
		DirectionalLight
	} from '@threlte/core'
	import { GLTF } from '@threlte/extras'
	import model from '$lib/assets/models/monitors.glb'

</script>

<div class="w-full h-full">
	<Canvas>

		<PerspectiveCamera position={{ x: -1400, y: 0, z: 0 }} lookAt= {{x:0, y:0, z:0 }}  fov={45}>
			<OrbitControls enableDamping/>
		</PerspectiveCamera>

		<DirectionalLight position={{ x: -100, y: 500, z: 0 }} intensity={0.7} />
		<AmbientLight intensity={0.2} />
		<GLTF 
			position={{x: 0, y: 0, z:60 }} 
			url={model} 
			useDraco={true} 
			interactive 
			on:click={() => {
				console.log('user clicked')
			}} 
		/>

	</Canvas>
</div>