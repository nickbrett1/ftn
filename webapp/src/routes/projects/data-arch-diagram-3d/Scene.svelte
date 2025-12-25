<script>
	import { T } from '@threlte/core';
	import { OrbitControls, Text, Float } from '@threlte/extras';
	import { onMount } from 'svelte';
	import { spring } from 'svelte/motion';

	// Data definition reuse
	const data = {
		governance: { title: 'Data Governance', color: '#10b981' }, // Emerald
		sources: { title: 'Sources', color: '#f59e0b', items: ['Streaming', 'Batch'] }, // Amber
		collect: {
			title: 'Collect & Transform',
			color: '#3b82f6',
			items: ['CDC | ETL | Event Streaming']
		}, // Blue
		store: {
			title: 'Store',
			color: '#a855f7', // Purple
			items: [
				{ name: 'Data Lake', sub: ['Raw', 'Staging', 'Prod', 'Sensitive'] },
				{ name: 'Data Warehouse', sub: ['Raw', 'Enriched', 'Curated'] }
			]
		},
		analyze: { title: 'Analyze', color: '#ef4444', items: ['Apps', 'BI', 'SQL', 'Notebooks'] }, // Red
		users: { title: 'End Users', color: '#ec4899', items: ['Business', 'Analysts', 'Scientists'] } // Pink
	};

	// Layout configuration
	const spacing = 15;

	// Pulse animation logic could go here
	import Pulse from './Pulse.svelte';
</script>

<T.PerspectiveCamera
	makeDefault
	position={[30, 20, 30]}
	fov={50}
	on:create={({ ref }) => {
		ref.lookAt(0, 0, 0);
	}}
>
	<OrbitControls enableZoom={true} enablePan={true} autoRotate={true} autoRotateSpeed={0.5} />
</T.PerspectiveCamera>

<T.DirectionalLight position={[10, 20, 10]} intensity={1.5} />
<T.AmbientLight intensity={0.5} />

<!-- Governance (Surrounding Field or Sidebar) -->
<T.Group position={[-15, 0, 0]}>
	<Float floatIntensity={1} rotationIntensity={0.2}>
		<T.Mesh position={[0, 5, 0]}>
			<T.BoxGeometry args={[2, 20, 40]} />
			<T.MeshStandardMaterial color={data.governance.color} transparent opacity={0.2} wireframe />
		</T.Mesh>
		<Text
			text={data.governance.title}
			color={data.governance.color}
			fontSize={2}
			position={[0, 16, 0]}
			rotation={[0, Math.PI / 2, 0]}
			anchorX="center"
			anchorY="middle"
		/>
	</Float>
</T.Group>

<!-- Main Flow -->
<T.Group position={[0, 0, -20]}>
	<!-- Sources -->
	<T.Group position={[0, 0, 0]}>
		<Text
			text={data.sources.title}
			color={data.sources.color}
			fontSize={1.5}
			position={[0, 4, 0]}
			anchorX="center"
			anchorY="middle"
		/>
		{#each data.sources.items as item, i}
			<T.Mesh position={[(i - 0.5) * 6, 0, 0]}>
				<T.BoxGeometry args={[4, 2, 2]} />
				<T.MeshStandardMaterial color={data.sources.color} />
				<Text
					text={item}
					color="white"
					fontSize={0.5}
					position={[0, 0, 1.1]}
					anchorX="center"
					anchorY="middle"
				/>
			</T.Mesh>
		{/each}
	</T.Group>

	<!-- Connection -->
	<T.Mesh position={[0, 0, spacing / 2]} rotation={[Math.PI / 2, 0, 0]}>
		<T.CylinderGeometry args={[0.2, 0.2, spacing, 8]} />
		<T.MeshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
	</T.Mesh>

	<!-- Pulses -->
	{#each Array(3) as _, i}
		<Pulse
			start={[0, 0, 0]}
			end={[0, 0, spacing]}
			speed={0.5 + i * 0.1}
			color={data.sources.color}
		/>
	{/each}

	<!-- Collect -->
	<T.Group position={[0, 0, spacing]}>
		<Text
			text={data.collect.title}
			color={data.collect.color}
			fontSize={1.5}
			position={[0, 4, 0]}
			anchorX="center"
			anchorY="middle"
		/>
		<T.Mesh>
			<T.BoxGeometry args={[10, 2, 2]} />
			<T.MeshStandardMaterial color={data.collect.color} />
			<Text
				text={data.collect.items[0]}
				color="white"
				fontSize={0.5}
				position={[0, 0, 1.1]}
				anchorX="center"
				anchorY="middle"
			/>
		</T.Mesh>
	</T.Group>

	<!-- Connection -->
	<T.Mesh position={[0, 0, spacing * 1.5]} rotation={[Math.PI / 2, 0, 0]}>
		<T.CylinderGeometry args={[0.2, 0.2, spacing, 8]} />
		<T.MeshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
	</T.Mesh>

	<!-- Pulses -->
	{#each Array(3) as _, i}
		<Pulse
			start={[0, 0, spacing]}
			end={[0, 0, spacing * 2]}
			speed={0.5 + i * 0.1}
			color={data.collect.color}
		/>
	{/each}

	<!-- Store -->
	<T.Group position={[0, 0, spacing * 2]}>
		<Text
			text={data.store.title}
			color={data.store.color}
			fontSize={1.5}
			position={[0, 6, 0]}
			anchorX="center"
			anchorY="middle"
		/>
		{#each data.store.items as item, i}
			<T.Group position={[(i - 0.5) * 12, 0, 0]}>
				<T.Mesh>
					<T.BoxGeometry args={[8, 4, 4]} />
					<T.MeshStandardMaterial color={data.store.color} transparent opacity={0.5} />
					<Text
						text={item.name}
						color="white"
						fontSize={0.8}
						position={[0, 2.5, 0]}
						anchorX="center"
						anchorY="middle"
					/>
				</T.Mesh>
				{#each item.sub as sub, j}
					<T.Mesh position={[0, 1 - j, 0]}>
						<T.BoxGeometry args={[6, 0.5, 3]} />
						<T.MeshStandardMaterial color={data.store.color} />
						<Text
							text={sub}
							color="white"
							fontSize={0.4}
							position={[0, 0, 1.6]}
							anchorX="center"
							anchorY="middle"
						/>
					</T.Mesh>
				{/each}
			</T.Group>
		{/each}
	</T.Group>

	<!-- Connection -->
	<T.Mesh position={[0, 0, spacing * 2.5]} rotation={[Math.PI / 2, 0, 0]}>
		<T.CylinderGeometry args={[0.2, 0.2, spacing, 8]} />
		<T.MeshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
	</T.Mesh>

	<!-- Pulses -->
	{#each Array(3) as _, i}
		<Pulse
			start={[0, 0, spacing * 2]}
			end={[0, 0, spacing * 3]}
			speed={0.5 + i * 0.1}
			color={data.store.color}
		/>
	{/each}

	<!-- Analyze -->
	<T.Group position={[0, 0, spacing * 3]}>
		<Text
			text={data.analyze.title}
			color={data.analyze.color}
			fontSize={1.5}
			position={[0, 4, 0]}
			anchorX="center"
			anchorY="middle"
		/>
		{#each data.analyze.items as item, i}
			<T.Mesh position={[(i - 1.5) * 4, 0, 0]}>
				<T.BoxGeometry args={[3, 2, 2]} />
				<T.MeshStandardMaterial color={data.analyze.color} />
				<Text
					text={item}
					color="white"
					fontSize={0.5}
					position={[0, 0, 1.1]}
					anchorX="center"
					anchorY="middle"
				/>
			</T.Mesh>
		{/each}
	</T.Group>

	<!-- Connection -->
	<T.Mesh position={[0, 0, spacing * 3.5]} rotation={[Math.PI / 2, 0, 0]}>
		<T.CylinderGeometry args={[0.2, 0.2, spacing, 8]} />
		<T.MeshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
	</T.Mesh>

	<!-- Pulses -->
	{#each Array(3) as _, i}
		<Pulse
			start={[0, 0, spacing * 3]}
			end={[0, 0, spacing * 4]}
			speed={0.5 + i * 0.1}
			color={data.analyze.color}
		/>
	{/each}

	<!-- Users -->
	<T.Group position={[0, 0, spacing * 4]}>
		<Text
			text={data.users.title}
			color={data.users.color}
			fontSize={1.5}
			position={[0, 4, 0]}
			anchorX="center"
			anchorY="middle"
		/>
		{#each data.users.items as item, i}
			<T.Mesh position={[(i - 1) * 6, 0, 0]}>
				<T.BoxGeometry args={[4, 2, 2]} />
				<T.MeshStandardMaterial color={data.users.color} />
				<Text
					text={item}
					color="white"
					fontSize={0.5}
					position={[0, 0, 1.1]}
					anchorX="center"
					anchorY="middle"
				/>
			</T.Mesh>
		{/each}
	</T.Group>
</T.Group>
