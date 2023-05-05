<script>
	import { onMount } from 'svelte'
	import { T, useFrame } from '@threlte/core'
	import { GLTF, OrbitControls, interactivity } from '@threlte/extras'
	import model from '$lib/assets/models/office.glb'
	import gsap from 'gsap'

	interactivity()

	let camera
	let tl 

	onMount(() => {
		tl = gsap.timeline({repeat: -1, yoyo: true})
		tl.to(camera.position, {x: 5, 
			y: 5, 
			z: 15, 
			duration: 10, 
			ease: 'power1.inOut'})
		
		tl.to(camera.position, {x: 15, 
			y: 5, 
			z: 5, 
			duration: 10, 
			ease: 'power1.inOut'})
	})

</script>

<T.PerspectiveCamera 
	position={[10, 5, 10]} 
	fov={50} 
	aspect={window.innerWidth / window.innerHeight} 
	near={0.1} 
	far={10000}
	makeDefault
	on:create={({ ref }) => {
		camera = ref
		ref.lookAt(0,0,0)
	}}
>
	<OrbitControls enableDamping/>
</T.PerspectiveCamera>

<T.DirectionalLight 
	position={[6, 8, 9]} 
	color="white"
	intensity={0.6}
/>

<T.AmbientLight intensity={0.2} />

<GLTF url={model}
	useDraco={true}
	on:click={(e) => {
		tl.pause()
		if(e.object.name == 'Office2_decoration1') {
			console.log('clicked on good day!')
			e.stopPropagation()
		}
	}}
	on:pointermove={(e) => {
		if(e.object.name == 'Office2_decoration1') {
			console.log('hovered on good day!')
			e.stopPropagation()
		}
	}}
/>




