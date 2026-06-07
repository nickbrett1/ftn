<script>
	import { onMount, onDestroy } from 'svelte';
	import { loadFull } from 'tsparticles';
	import { tsParticles } from '@tsparticles/engine';

	// eslint-disable-next-line sonarjs/no-commented-code
	/** @type {boolean} */
	let { show = false } = $props();

	let particlesInstance = $state();

	// Fireworks configuration for tsparticles - MEGA SPECTACULAR celebration!
	const fireworksConfig = {
		fullScreen: {
			enable: true,
			zIndex: 50
		},
		background: {
			color: 'transparent'
		},
		emitters: {
			direction: 'top',
			life: {
				count: 0,
				duration: 0.1,
				delay: 0.1
			},
			rate: {
				delay: 0.15,
				quantity: 1
			},
			size: {
				width: 100,
				height: 0
			},
			position: {
				y: 100,
				x: 50
			},
			particles: {
				move: {
					enable: true,
					speed: { min: 10, max: 25 },
					physics: {
						enable: true,
						gravity: {
							enable: true,
							acceleration: 9.81
						}
					},
					outModes: {
						default: 'destroy',
						top: 'none'
					}
				},
				number: {
					value: 0
				},
				color: {
					value: '#ffffff'
				},
				shape: {
					type: 'circle'
				},
				opacity: {
					value: 1
				},
				size: {
					value: { min: 1, max: 3 }
				},
				destroy: {
					mode: 'split',
					split: {
						count: 1,
						factor: { value: 1 / 3 },
						rate: { value: 3 },
						particles: {
							color: {
								value: [
									'#ff595e',
									'#ffca3a',
									'#8ac926',
									'#1982c4',
									'#6a4c93',
									'#ff6b6b',
									'#4ecdc4',
									'#feca57',
									'#ff9ff3',
									'#54a0ff'
								]
							},
							move: {
								enable: true,
								destroy: {
									mode: 'none'
								},
								speed: { min: 2, max: 8 },
								direction: 'none',
								random: true,
								straight: false,
								outModes: {
									default: 'destroy'
								},
								gravity: {
									enable: true,
									acceleration: 2
								},
								decay: 0.05
							},
							number: {
								value: 0
							},
							opacity: {
								value: 1,
								animation: {
									enable: true,
									speed: 0.3,
									minimumValue: 0,
									sync: false,
									startValue: 'max'
								}
							},
							size: {
								value: { min: 1, max: 4 }
							},
							life: {
								duration: {
									sync: true,
									value: 1.5
								}
							}
						}
					}
				}
			}
		}
	};

	async function initParticles() {
		try {
			// Load tsparticles with full features (including emitters & split destroy mode)
			await loadFull(tsParticles);

			// Initialize particles with id approach (like other components)
			particlesInstance = await tsParticles.load({
				id: 'fireworks-particles',
				options: fireworksConfig
			});
		} catch (error) {
			console.error('❌ Fireworks: Error initializing particles:', error);
		}
	}

	function startFireworks() {
		if (!particlesInstance) {
			return;
		}
		// Particles animate automatically based on configuration
	}

	function stopFireworks() {
		if (particlesInstance) {
			particlesInstance.destroy();
			particlesInstance = null;
		}
	}

	// Watch for show prop changes
	$effect(() => {
		if (show) {
			// Initialize particles when show becomes true
			initParticles().then(() => {
				startFireworks();
			});
		} else {
			stopFireworks();
		}
	});

	onMount(() => {
		// Don't initialize particles on mount - wait for show to become true
	});

	onDestroy(() => {
		if (particlesInstance) {
			particlesInstance.destroy();
		}
	});
</script>

{#if show}
	<div class="fixed inset-0 pointer-events-none z-50">
		<div id="fireworks-particles" class="w-full h-full"></div>
	</div>
{/if}
