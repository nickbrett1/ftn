<script>
	import { onMount, onDestroy } from 'svelte';
	import { tsParticles } from '@tsparticles/engine';
	import { loadSlim } from '@tsparticles/slim';
	import { loadTextShape } from '@tsparticles/shape-text';

	export let show = false;
	export let containerId = 'fireworks-container';

	let container;
	let particlesInitialized = false;

	onMount(async () => {
		await loadSlim(tsParticles);
		await loadTextShape(tsParticles);
		particlesInitialized = true;
	});

	async function startFireworks() {
		if (!particlesInitialized || !container) return;

		await tsParticles.load({
			id: containerId,
			element: container,
			options: {
				fpsLimit: 60,
				particles: {
					number: {
						value: 150,
						density: {
							enable: true,
							value_area: 800
						}
					},
					color: {
						value: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
					},
					shape: {
						type: 'circle'
					},
					opacity: {
						value: 1,
						random: false,
						anim: {
							enable: true,
							speed: 1,
							opacity_min: 0,
							sync: false
						}
					},
					size: {
						value: 3,
						random: true,
						anim: {
							enable: true,
							speed: 2,
							size_min: 0.3,
							sync: false
						}
					},
					line_linked: {
						enable: false
					},
					move: {
						enable: true,
						speed: 6,
						direction: 'none',
						random: false,
						straight: false,
						out_mode: 'out',
						bounce: false,
						attract: {
							enable: false,
							rotateX: 600,
							rotateY: 1200
						}
					}
				},
				interactivity: {
					detect_on: 'canvas',
					events: {
						onclick: {
							enable: true,
							mode: 'repulse'
						},
						onresize: true
					},
					modes: {
						repulse: {
							distance: 100,
							duration: 0.4
						}
					}
				},
				retina_detect: true
			}
		});
	}



	$: if (show && particlesInitialized) {
		console.log('🎆 Starting fireworks display!');
		startFireworks();
	}

	onDestroy(() => {
		if (container) {
			tsParticles.destroy(container);
		}
	});
</script>

<div
	bind:this={container}
	{containerId}
	class="fixed inset-0 pointer-events-none z-50"
	style="display: {show ? 'block' : 'none'}"
></div>