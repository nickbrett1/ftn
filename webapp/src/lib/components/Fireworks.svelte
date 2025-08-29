<script>
	import { onMount, onDestroy } from 'svelte';
	import { loadSlim } from '@tsparticles/slim';
	import { tsParticles } from '@tsparticles/engine';

	/** @type {boolean} */
	let { show = false } = $props();

	let particlesInstance = $state();

	// Fireworks configuration for tsparticles - simplified to match working examples
	const fireworksConfig = {
		particles: {
			number: {
				value: 50
			},
			color: {
				value: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff']
			},
			shape: {
				type: 'circle'
			},
			opacity: {
				value: 1,
				animation: {
					enable: true,
					speed: 1,
					sync: false
				}
			},
			size: {
				value: { min: 5, max: 15 },
				animation: {
					enable: true,
					speed: 3,
					minimumValue: 1,
					sync: false
				}
			},
			move: {
				enable: true,
				speed: { min: 2, max: 8 },
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
			console.log('🎆 Fireworks: Loading TSParticles...');
			// Load tsparticles
			loadSlim(tsParticles);
			console.log('✅ Fireworks: TSParticles loaded successfully');

			// Initialize particles with id approach (like other components)
			particlesInstance = await tsParticles.load({
				id: 'fireworks-particles',
				options: fireworksConfig
			});
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
		// For now, just show the particles - they'll animate automatically
		// The particles are already configured to move and animate
	}

	function stopFireworks() {
		if (particlesInstance) {
			console.log('🎆 Fireworks: Stopping fireworks and destroying particles instance');
			particlesInstance.destroy();
			particlesInstance = null;
		}
	}

	// Watch for show prop changes
	$effect(() => {
		console.log('🎆 Fireworks: show prop changed to:', show);
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
		console.log('🎆 Fireworks: Component mounted, waiting for show prop');
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
		<!-- Debug indicator -->
		<div class="absolute top-4 left-4 bg-red-500 text-white p-2 rounded">
			🎆 Fireworks Active
		</div>
	</div>
{/if}