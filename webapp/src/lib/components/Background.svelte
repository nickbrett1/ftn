<script>
	import fintechgreen from '$lib/assets/images/fintechgreen.png?run';
	import Img from '@zerodevx/svelte-img';
	import { onMount } from "svelte";
	import { loadFull } from 'tsparticles';

	let particlesConfig =
{
	fullScreen: {
		enable: true,
		zIndex: -1
	},
  fpsLimit: 60,
  interactivity: {
    detect_on: "canvas",
    events: {
      onclick: { enable: true, mode: "push" },
      onhover: {
        enable: true,
        mode: "repulse",
        parallax: { enable: false, force: 60, smooth: 10 }
      },
      resize: true
    },
    modes: {
      bubble: { distance: 400, duration: 2, opacity: 0.8, size: 40, speed: 3 },
      grab: { distance: 400, links: { opacity: 1 } },
      push: { quantity: 4 },
      remove: { quantity: 2 },
      repulse: { distance: 200, duration: 0.4 }
    }
  },
  particles: {
    color: { value: "random" },
    links: {
      color: "random",
      distance: 150,
      enable: false,
      opacity: 0.4,
      width: 1
    },
    move: {
      attract: { enable: false, rotateX: 600, rotateY: 1200 },
      bounce: false,
      direction: "none",
      enable: true,
      out_mode: "out",
      random: false,
      speed: 3,
      straight: false
    },
    rotate: {
      animation: {
        enable: true,
        speed: 10,
        sync: false
      }
    },
    number: { density: { enable: true, area: 800 }, value: 20 },
    opacity: {
      animation: { enable: true, minimumValue: 0.5, speed: 1, sync: false },
      random: false,
      value: 1
    },
    shape: {
      character: [
        {
          fill: true,
          font: "Verdana",
          style: "",
          value: ["hello", "world"],
          weight: "400"
        },
      ],
      polygon: { nb_sides: 5 },
      stroke: { color: "random", width: 1 },
      type: "char"
    },
    size: {
      anim: { enable: true, minimumValue: 8, speed: 20, sync: false },
      random: { minimumValue: 8, enable: true },
      value: 18
    }
  },
  detectRetina: true
};


	let ParticlesComponent;

	onMount(async () => {
		const module = await import("svelte-particles");
		ParticlesComponent = module.default;
	});

	let onParticlesLoaded = event => {
		console.log("Particles loaded", event.detail);
	};

	let particlesInit = async main => {
		await loadFull(main);
	};

</script>

<Img src={fintechgreen} loading="eager" alt="background" /> 

<svelte:component
	this="{ParticlesComponent}"
	options="{particlesConfig}"
	on:particlesLoaded="{onParticlesLoaded}"
	particlesInit="{particlesInit}"
/>