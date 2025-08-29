<script>
	import { onMount, onDestroy } from 'svelte';
	import { loadSlim } from '@tsparticles/slim';
	import { tsParticles } from '@tsparticles/engine';

	/** @type {boolean} */
	let { show = false } = $props();

	let container = $state();
	let particlesInstance = $state();

	// Fireworks configuration for tsparticles
	const fireworksConfig = {
		particles: {
			number: {
				value: 0
			},
			color: {
				value: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#ff6b9d', '#c44569', '#f8b500']
			},
			shape: {
				type: 'circle'
			},
			opacity: {
				value: 1,
				animation: {
					enable: true,
					speed: 0.5,
					sync: false,
					destroy: 'none',
					startValue: 'random'
				}
			},
			size: {
				value: { min: 1, max: 4 },
				animation: {
					enable: true,
					speed: 2,
					minimumValue: 0.1,
					sync: false,
					startValue: 'random',
					destroy: 'none'
				}
			},
			life: {
				duration: {
					sync: false,
					value: 3
				},
				count: 1
			},
			move: {
				enable: true,
				gravity: {
					enable: true,
					acceleration: 9.81,
					inverse: false
				},
				speed: { min: 5, max: 15 },
				direction: 'none',
				random: true,
				straight: false,
				outModes: {
					default: 'destroy',
					top: 'none'
				}
			}
		},
		emitters: {
			life: {
				count: 0,
				duration: 0.1,
				delay: 0.1
			},
			rate: {
				delay: 0.1,
				quantity: 0
			},
			size: {
				width: 0,
				height: 0
			}
		},
		background: {
			color: 'transparent'
		},
		fullScreen: {
			enable: true,
			zIndex: 50
		},
		detectRetina: true
	};

	async function initParticles() {
		if (!container) {
			console.log('🚫 Fireworks: No container element');
			return;
		}

		try {
			console.log('🎆 Fireworks: Loading TSParticles...');
			// Load tsparticles
			await loadSlim(tsParticles);
			console.log('✅ Fireworks: TSParticles loaded successfully');

			// Initialize particles
			particlesInstance = await tsParticles.load(container, fireworksConfig);
			console.log('✅ Fireworks: Particles instance created:', particlesInstance);
		} catch (error) {
			console.error('❌ Fireworks: Error initializing particles:', error);
		}
	}

	function startFireworks() {
		console.log('🎆 Fireworks: startFireworks called, particlesInstance:', particlesInstance);
		if (!particlesInstance) {
			console.log('🚫 Fireworks: No particles instance available');
			return;
		}

		console.log('🎆 Fireworks: Starting fireworks animation...');
		// Create multiple firework bursts
		const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
		
		// Create 5-8 firework bursts over 3 seconds
		for (let i = 0; i < 6; i++) {
			setTimeout(() => {
				if (!particlesInstance) {
					console.log('🚫 Fireworks: Particles instance lost during animation');
					return;
				}
				
				// Random position for firework
				const x = Math.random() * window.innerWidth;
				const y = Math.random() * (window.innerHeight * 0.6) + (window.innerHeight * 0.2);
				
				console.log(`🎆 Fireworks: Creating firework ${i + 1} at (${x}, ${y})`);
				
				// Create firework burst
				particlesInstance.addParticles({
					particles: {
						number: {
							value: 30
						},
						color: {
							value: colors[Math.floor(Math.random() * colors.length)]
						},
						shape: {
							type: 'circle'
						},
						opacity: {
							value: 1,
							animation: {
								enable: true,
								speed: 0.5,
								sync: false,
								destroy: 'none',
								startValue: 'random'
							}
						},
						size: {
							value: { min: 2, max: 6 },
							animation: {
								enable: true,
								speed: 2,
								minimumValue: 0.1,
								sync: false,
								startValue: 'random',
								destroy: 'none'
							}
						},
						life: {
							duration: {
								sync: false,
								value: 3
							},
							count: 1
						},
						move: {
							enable: true,
							gravity: {
								enable: true,
								acceleration: 9.81,
								inverse: false
							},
							speed: { min: 8, max: 20 },
							direction: 'none',
							random: true,
							straight: false,
							outModes: {
								default: 'destroy',
								top: 'none'
							}
						}
					},
					position: {
						x: x,
						y: y
					}
				});
			}, i * 500);
		}
	}

	function stopFireworks() {
		if (particlesInstance) {
			particlesInstance.clear();
		}
	}

	// Watch for show prop changes
	$effect(() => {
		if (show) {
			startFireworks();
		} else {
			stopFireworks();
		}
	});

	onMount(async () => {
		await initParticles();
	});

	onDestroy(() => {
		if (particlesInstance) {
			particlesInstance.destroy();
		}
	});
</script>

{#if show}
	<div class="fixed inset-0 pointer-events-none z-50">
		<div bind:this={container} class="w-full h-full"></div>
	</div>
{/if}