<script>
	import { onMount } from 'svelte';
	import { tsParticles } from '@tsparticles/engine';
	import { loadSlim } from '@tsparticles/slim';
	import { loadTextShape } from '@tsparticles/shape-text';

	let particlesConfig = {
		fullScreen: {
			enable: true,
			zIndex: -1
		},
		fpsLimit: 60,
		interactivity: {
			detect_on: 'canvas',
			events: {
				onClick: { enable: false, mode: 'push' },
				onHover: {
					enable: true,
					mode: 'connect',
					parallax: { enable: false, force: 60, smooth: 10 }
				},
				resize: true
			},
			modes: {
				bubble: { distance: 400, duration: 2, opacity: 0.8, size: 40, speed: 3 },
				grab: { distance: 400, lineLinked: { opacity: 1 } },
				push: { quantity: 4 },
				remove: { quantity: 2 },
				repulse: { distance: 200, duration: 0.4 },
				connect: { distance: 400, links: { opacity: 0.5 }, radius: 150 }
			}
		},
		particles: {
			links: {
				color: 'random',
				distance: 150,
				enable: true,
				opacity: 0.4,
				width: 1
			},

			move: {
				attract: { enable: false, rotateX: 600, rotateY: 1200 },
				bounce: true,
				direction: 'top',
				enable: true,
				out_mode: 'out',
				random: false,
				speed: 1,
				straight: false
			},
			rotate: {
				animation: {
					enable: false,
					speed: 10,
					sync: false
				}
			},
			number: { density: { enable: true, area: 800 }, value: 20 },
			opacity: {
				animation: { enable: true, speed: 0.5, sync: false },
				random: false,
				value: { min: 0.1, max: 0.8 }
			},
			shape: {
				type: 'text',
				options: {
					text: [
						{
							fill: true,
							font: 'Verdana',
							// Generate array of 50 random numbers between 0.1 and 15 rounded to two decimal places
							value: Array.from(
								{ length: 50 },
								() => '+' + Math.round(Math.random() * 15 * 100) / 100 + '%'
							),
							weight: '400',
							particles: {
								color: '#00FF9E',
								size: {
									value: 8
								}
							}
						},
						{
							fill: true,
							font: 'Verdana',
							value: Array.from(
								{ length: 50 },
								() => '-' + Math.round(Math.random() * 15 * 100) / 100 + '%'
							),
							weight: '400',
							particles: {
								color: '#FF0061',
								size: {
									value: 8
								}
							}
						}
					]
				}
			},
			links: {
				blink: false,
				distance: 400,
				enable: true,
				frequency: 1,
				opacity: 0.2,
				width: 1,
				warp: false
			}
		},
		detectRetina: true
	};

	onMount(async () => {
		loadSlim(tsParticles);
		loadTextShape(tsParticles);

		tsParticles.load({
			id: 'tsparticles',
			options: particlesConfig
		});
	});
</script>

<div id="tsparticles"></div>
