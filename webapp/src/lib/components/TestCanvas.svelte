<script>
	import { Canvas } from '@threlte/core';
	import { T } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
</script>

<div class="w-full h-full bg-green-500 border-4 border-yellow-400">
	<Canvas style="width: 100%; height: 100%; background: purple;">
		<T.PerspectiveCamera position={[0, 0, 5]} makeDefault />
		<T.AmbientLight intensity={0.5} />
		<T.DirectionalLight position={[10, 10, 5]} intensity={1} />
		
		<T.Mesh position={[0, 0, 0]}>
			<T.BoxGeometry args={[1, 1, 1]} />
			<T.MeshStandardMaterial color="red" />
		</T.Mesh>
		
		<T.Mesh position={[2, 0, 0]}>
			<T.SphereGeometry args={[0.5]} />
			<T.MeshStandardMaterial color="blue" />
		</T.Mesh>
		
		<OrbitControls />
	</Canvas>
</div>