<script>
	import fintechgreen from '$lib/assets/images/fintechgreen.png?run';
	import Img from '@zerodevx/svelte-img';
	import { onMount } from "svelte";
	import { loadBigCirclesPreset } from "tsparticles-preset-big-circles";

	let particlesConfig = {
    preset: "bigCircles", 
		fullScreen: {
			enable: true,
			zIndex: -1,
		},
	};

	let ParticlesComponent;

	onMount(async () => {
		const module = await import("svelte-particles");
		ParticlesComponent = module.default;
	});

	let onParticlesLoaded = event => {
	};

	let particlesInit = async main => {
		await loadBigCirclesPreset(main);
	};

</script>

<Img src={fintechgreen} loading="eager" alt="background" /> 

<svelte:component
	this="{ParticlesComponent}"
	id="tsparticles"
	options="{particlesConfig}"
	on:particlesLoaded="{onParticlesLoaded}"
	particlesInit="{particlesInit}"
/>


