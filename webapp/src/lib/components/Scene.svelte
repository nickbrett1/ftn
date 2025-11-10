<script>
	import { onMount } from 'svelte';
	import { T } from '@threlte/core';
	import { GLTF, OrbitControls, interactivity } from '@threlte/extras';
	import gsap from 'gsap';

	interactivity();

	let camera = $state();
	let tl = $state();

	onMount(() => {
		tl = gsap.timeline({ repeat: -1, yoyo: true });
		tl.to(camera.position, { x: 0, y: 0, z: 5, duration: 10, ease: 'power1.inOut' });

		tl.to(camera.position, { x: 5, y: 0, z: 0, duration: 10, ease: 'power1.inOut' });
	});
</script>

<T.PerspectiveCamera
	position={[0, 0, 5]}
	fov={50}
	aspect={window.innerWidth / window.innerHeight}
	near={0.1}
	far={10_000}
	makeDefault
	oncreate={(reference) => {
		camera = reference;
		reference.lookAt(0, 0, 0);
	}}
>
	<OrbitControls enableDamping />
</T.PerspectiveCamera>

<T.DirectionalLight position={[6, 8, 9]} color="white" intensity={0.6} />

<T.AmbientLight intensity={0.2} />

<GLTF
	url="/models/charging_bull.glb"
	useDraco={true}
	on:click={(e) => {
		tl.pause();
		if (e.object.name == 'Office2_decoration1') {
			console.log('clicked on good day!');
			e.stopPropagation();
		}
	}}
	on:pointermove={(e) => {
		if (e.object.name == 'Office2_decoration1') {
			console.log('hovered on good day!');
			console.log(e.object);
			//		let outlineMaterial1 = new T.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );

			e.object.geometry.material.color.set(0x00_ff_00);
			e.stopPropagation();
		} else {
			e.object.material.color.set(0xff_ff_ff);
		}
	}}
/>
