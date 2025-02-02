<!-- Inspiration from https://codepen.io/webLeister/pen/XwGENz/ -->

<script>
	import { particlesInit } from '@tsparticles/svelte';
	import { onMount } from 'svelte';
	import { loadSlim } from '@tsparticles/slim';
	import { loadExternalTrailInteraction } from '@tsparticles/interaction-external-trail';

	let ParticlesComponent;

	onMount(async () => {
		const module = await import('@tsparticles/svelte');

		ParticlesComponent = module.default;
	});

	let particlesConfig = {
		fullScreen: {
			enable: false,
			zIndex: 10
		},
		detectRetina: true,
		fpsLimit: 120,
		interactivity: {
			detectsOn: 'window',
			events: {
				onHover: {
					enable: true,
					mode: 'trail',
					parallax: {
						enable: false,
						force: 2,
						smooth: 10
					}
				},
				resize: {
					enable: true
				}
			},
			modes: {
				trail: {
					delay: 0.005,
					pauseOnStop: true,
					quantity: 5,
					particles: {
						color: {
							value: '#ff0000',
							animation: {
								enable: true,
								speed: 400,
								sync: true
							}
						},
						collisions: {
							enable: false
						},
						links: {
							enable: false
						},
						move: {
							outModes: {
								default: 'destroy'
							},
							speed: 2
						},
						size: {
							value: {
								min: 1,
								max: 5
							},
							animation: {
								enable: true,
								speed: 5,
								sync: true,
								startValue: 'min',
								destroy: 'max'
							}
						}
					}
				}
			}
		},
		particles: {
			move: {
				angle: {
					offset: 0,
					value: 90
				},
				attract: {
					distance: 200,
					enable: false,
					rotate: {
						x: 3000,
						y: 3000
					}
				},
				center: {
					x: 50,
					y: 50,
					mode: 'percent',
					radius: 0
				},
				decay: 0,
				distance: {},
				direction: 'none',
				drift: 0,
				enable: true,
				gravity: {
					acceleration: 9.81,
					enable: false,
					inverse: false,
					maxSpeed: 50
				},
				path: {
					clamp: true,
					delay: {
						value: 0
					},
					enable: false,
					options: {}
				},
				outModes: {
					default: 'out',
					bottom: 'out',
					left: 'out',
					right: 'out',
					top: 'out'
				},
				random: false,
				size: false,
				speed: 2,
				spin: {
					acceleration: 0,
					enable: false
				},
				straight: false,
				trail: {
					enable: false,
					length: 10,
					fill: {}
				},
				vibrate: false,
				warp: false
			},
			opacity: {
				value: {
					min: 0.3,
					max: 0.8
				},
				animation: {
					count: 0,
					enable: true,
					speed: 0.5,
					decay: 0,
					delay: 0,
					sync: false,
					mode: 'auto',
					startValue: 'random',
					destroy: 'none'
				}
			},
			reduceDuplicates: false,
			size: {
				value: {
					min: 1,
					max: 3
				},
				animation: {
					count: 0,
					enable: true,
					speed: 3,
					decay: 0,
					delay: 0,
					sync: false,
					mode: 'auto',
					startValue: 'random',
					destroy: 'none'
				}
			},
			stroke: {
				width: 0
			},
			zIndex: {
				value: 0,
				opacityRate: 1,
				sizeRate: 1,
				velocityRate: 1
			},
			destroy: {
				bounds: {},
				mode: 'none',
				split: {
					count: 1,
					factor: {
						value: 3
					},
					rate: {
						value: {
							min: 4,
							max: 9
						}
					},
					sizeOffset: true,
					particles: {}
				}
			}
		},
		smooth: false,
		zLayers: 100
	};
	let onParticlesLoaded = (event) => {
		const particlesContainer = event.detail.particles;
	};

	void particlesInit(async (engine) => {
		await loadSlim(engine);
		await loadExternalTrailInteraction(engine);
	});
</script>

<div class="relative">
	<div class="z-20">Let Me Introduce Myself</div>

	<div class="absolute inset-0 z-10">
		<svelte:component
			this={ParticlesComponent}
			id="introparticles"
			options={particlesConfig}
			on:particlesLoaded={onParticlesLoaded}
		/>
	</div>
</div>
