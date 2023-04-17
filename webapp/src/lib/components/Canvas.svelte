<script>
	import { 
		Canvas, 
		OrbitControls, 
		PerspectiveCamera, 
		AmbientLight, 
	} from '@threlte/core'
	import { GLTF } from '@threlte/extras'
	import model from '$lib/assets/models/monitors.glb'
	
</script>

<div class="w-full h-full">
	<Canvas>

		<PerspectiveCamera position={{ x: -1500, y: 0, z: 0 }} lookAt= {{x:0, y:0, z:0 }}  fov={45}>
			<OrbitControls autoRotate enableDamping/>
		</PerspectiveCamera>

		<AmbientLight />
		<GLTF 
			position={{x: 0, y: 0, z:0 }} 
			url={model} 
			useDraco={true} 
			interactive 
			on:click={() => {
				console.log('user clicked')
			}} 
		/>

	</Canvas>
</div>