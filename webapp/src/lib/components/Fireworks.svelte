<script>
	import { onMount, onDestroy } from 'svelte';
	import { loadSlim } from '@tsparticles/slim';
	import { tsParticles } from '@tsparticles/engine';

	/** @type {boolean} */
	let { show = false } = $props();

	let particlesInstance = $state();

	// Fireworks configuration for tsparticles - subtle and elegant
	const fireworksConfig = {
		particles: {
			number: {
				value: 30
			},
			color: {
				value: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff']
			},
			shape: {
				type: 'circle'
			},
			opacity: {
				value: 1,
				animation: {
					enable: true,
					speed: 0.5,
					sync: false
				}
			},
			size: {
				value: { min: 1, max: 4 },
				animation: {
					enable: true,
					speed: 2,
					minimumValue: 0.1,
					sync: false
				}
			},
			move: {
				enable: true,
				speed: { min: 5, max: 15 },
				direction: 'none',
				random: true,
				straight: false,
				outModes: {
					default: 'destroy'
				}
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
		try {
			// Load tsparticles
			loadSlim(tsParticles);

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