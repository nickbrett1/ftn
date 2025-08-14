<script>
	import { T } from '@threlte/core';
</script>

<!-- Main grid plane -->
<T.Mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
	<T.PlaneGeometry args={[50, 50]} />
	<T.MeshStandardMaterial 
		color="#0a0a0a" 
		transparent={true} 
		opacity={0.8}
		metalness={0.9}
		roughness={0.1}
	/>
</T.Mesh>

<!-- Grid lines -->
<T.LineSegments>
	<T.BufferGeometry>
		<T.BufferAttribute 
			attach="attributes.position" 
			count={44} 
			array={new Float32Array([
				// Vertical lines
				-25, 0, -25, -25, 0, 25,
				-20, 0, -25, -20, 0, 25,
				-15, 0, -25, -15, 0, 25,
				-10, 0, -25, -10, 0, 25,
				-5, 0, -25, -5, 0, 25,
				0, 0, -25, 0, 0, 25,
				5, 0, -25, 5, 0, 25,
				10, 0, -25, 10, 0, 25,
				15, 0, -25, 15, 0, 25,
				20, 0, -25, 20, 0, 25,
				25, 0, -25, 25, 0, 25,
				// Horizontal lines
				-25, 0, -25, 25, 0, -25,
				-25, 0, -20, 25, 0, -20,
				-25, 0, -15, 25, 0, -15,
				-25, 0, -10, 25, 0, -10,
				-25, 0, -5, 25, 0, -5,
				-25, 0, 0, 25, 0, 0,
				-25, 0, 5, 25, 0, 5,
				-25, 0, 10, 25, 0, 10,
				-25, 0, 15, 25, 0, 15,
				-25, 0, 20, 25, 0, 20,
				-25, 0, 25, 25, 0, 25
			])} 
			itemSize={3} 
		/>
	</T.BufferGeometry>
	<T.LineBasicMaterial color="#1a1a1a" transparent={true} opacity={0.3} />
</T.LineSegments>

<!-- Center cross for reference -->
<T.LineSegments>
	<T.BufferGeometry>
		<T.BufferAttribute 
			attach="attributes.position" 
			count={4} 
			array={new Float32Array([
				-30, 0, 0, 30, 0, 0,
				0, 0, -30, 0, 0, 30
			])} 
			itemSize={3} 
		/>
	</T.BufferGeometry>
	<T.LineBasicMaterial color="#00ff88" linewidth={2} />
</T.LineSegments>

<!-- Sector dividers (vertical lines) -->
<T.LineSegments>
	<T.BufferGeometry>
		<T.BufferAttribute 
			attach="attributes.position" 
			count={6} 
			array={new Float32Array([
				-16, 0, -25, -16, 0, 25,
				-8, 0, -25, -8, 0, 25,
				0, 0, -25, 0, 0, 25,
				8, 0, -25, 8, 0, 25,
				16, 0, -25, 16, 0, 25
			])} 
			itemSize={3} 
		/>
	</T.BufferGeometry>
	<T.LineBasicMaterial color="#0088ff" linewidth={3} />
</T.LineSegments>