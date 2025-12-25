<script>
	import { T, useTask } from '@threlte/core';

	export let start = [0, 0, 0];
	export let end = [0, 0, 0];
	export let speed = 0.5;
	export let color = 'white';

	let progress = 0;
	let position = [...start];

	useTask((delta) => {
		progress += delta * speed;
		if (progress > 1) progress = 0;

		const x = start[0] + (end[0] - start[0]) * progress;
		const y = start[1] + (end[1] - start[1]) * progress;
		const z = start[2] + (end[2] - start[2]) * progress;
		position = [x, y, z];
	});
</script>

<T.Mesh {position}>
	<T.SphereGeometry args={[0.3, 16, 16]} />
	<T.MeshBasicMaterial {color} toneMapped={false} />
	<T.PointLight {color} intensity={2} distance={5} decay={2} />
</T.Mesh>
