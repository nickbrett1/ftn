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
				value: { min: 2, max: 6 },
				animation: {
					enable: true,
					speed: 2,
					minimumValue: 0.1,
					sync: false
				}
			},
			move: {
				enable: true,
				speed: { min: 8, max: 20 },
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
			particlesInstance.clear();
		}
	}

	// Watch for show prop changes
	$effect(() => {
		console.log('🎆 Fireworks: show prop changed to:', show);
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
		<div id="fireworks-particles" class="w-full h-full"></div>
		<!-- Debug indicator -->
		<div class="absolute top-4 left-4 bg-red-500 text-white p-2 rounded">
			🎆 Fireworks Active
		</div>
	</div>
{/if}