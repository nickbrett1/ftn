<script>
	import { T } from '@threlte/core';
</script>

<!-- Main grid plane -->
<T.Mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
	<T.PlaneGeometry args={[80, 80]} />
	<T.MeshBasicMaterial
		color="#0a0a0a"
		transparent
		opacity={0.3}
		side="DoubleSide"
	/>
</T.Mesh>

<!-- Grid lines for visual reference -->
<T.LineSegments>
	<T.BufferGeometry>
		<T.BufferAttribute
			attach="attributes.position"
			count={44}
			array={new Float32Array([
				// Horizontal lines
				-40, 0, -40, 40, 0, -40,
				-40, 0, -30, 40, 0, -30,
				-40, 0, -20, 40, 0, -20,
				-40, 0, -10, 40, 0, -10,
				-40, 0, 0, 40, 0, 0,
				-40, 0, 10, 40, 0, 10,
				-40, 0, 20, 40, 0, 20,
				-40, 0, 30, 40, 0, 30,
				-40, 0, 40, 40, 0, 40,
				
				// Vertical lines
				-40, 0, -40, -40, 0, 40,
				-30, 0, -40, -30, 0, 40,
				-20, 0, -40, -20, 0, 40,
				-10, 0, -40, -10, 0, 40,
				0, 0, -40, 0, 0, 40,
				10, 0, -40, 10, 0, 40,
				20, 0, -40, 20, 0, 40,
				30, 0, -40, 30, 0, 40,
				40, 0, -40, 40, 0, 40
			])}
			itemSize={3}
		/>
	</T.BufferGeometry>
	<T.LineBasicMaterial color="#1a1a1a" transparent opacity={0.2} />
</T.LineSegments>

<!-- Sector dividers with neon glow -->
{#each ['Technology', 'Healthcare', 'Financial Services', 'Consumer Discretionary', 'Industrials'] as sector, index}
	{@const x = (index - 2) * 8}
	
	<!-- Sector divider line -->
	<T.LineSegments>
		<T.BufferGeometry>
			<T.BufferAttribute
				attach="attributes.position"
				count={2}
				array={new Float32Array([x, 0, -40, x, 0, 40])}
				itemSize={3}
			/>
		</T.BufferGeometry>
		<T.LineBasicMaterial 
			color="#00ff88" 
			transparent 
			opacity={0.4}
			linewidth={2}
		/>
	</T.LineSegments>
	
	<!-- Sector label -->
	<T.Mesh position={[x, 0.1, 35]}>
		<T.PlaneGeometry args={[6, 1]} />
		<T.MeshBasicMaterial
			color="#000000"
			transparent
			opacity={0.8}
			side="DoubleSide"
		/>
	</T.Mesh>
{/each}

<!-- Center cross for reference -->
<T.LineSegments>
	<T.BufferGeometry>
		<T.BufferAttribute
			attach="attributes.position"
			count={4}
			array={new Float32Array([
				-2, 0, 0, 2, 0, 0,
				0, 0, -2, 0, 0, 2
			])}
			itemSize={3}
		/>
	</T.BufferGeometry>
	<T.LineBasicMaterial color="#00ff88" transparent opacity={0.6} linewidth={3} />
</T.LineSegments>