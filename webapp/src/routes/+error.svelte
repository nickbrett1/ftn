<script>
	import { page } from '$app/stores';
	import Button from '$lib/components/Button.svelte';
	import { onMount } from 'svelte';
	import { tsParticles } from '@tsparticles/engine';
	import { loadSlim } from '@tsparticles/slim';
	import { loadTextShape } from '@tsparticles/shape-text';
	import { createErrorParticleConfig } from '$lib/client/particleConfig.js';

	$: status = $page.status;
	$: error = $page.error;

	// Create the particle configuration using the utility
	const particlesConfig = createErrorParticleConfig();

	onMount(async () => {
		loadSlim(tsParticles);
		loadTextShape(tsParticles);

		tsParticles.load({
			id: 'error-particles',
			options: particlesConfig
		});
	});
</script>

<svelte:head>
	<title>{status}: {error?.message || 'Page not found'}</title>
	<meta name="description" content="The page you're looking for cannot be found." />
</svelte:head>

<div class="min-h-screen flex items-center justify-center relative overflow-hidden">
	<!-- tsparticles background -->
	<div id="error-particles" class="absolute inset-0"></div>

	<div class="text-center space-y-6 p-8 relative z-10 max-w-2xl">
		<!-- Glitch effect 404 number -->
		<div class="relative mb-8">
			<h1 class="text-8xl sm:text-9xl font-bold text-green-400 relative glitch-text">
				{status}
			</h1>
			<!-- Glitch layers -->
			<h1 class="text-8xl sm:text-9xl font-bold text-green-400 absolute inset-0 glitch-layer-1">
				{status}
			</h1>
			<h1 class="text-8xl sm:text-9xl font-bold text-green-400 absolute inset-0 glitch-layer-2">
				{status}
			</h1>
		</div>

		<!-- Error message with softer glow -->
		<div class="space-y-4">
			<h2 class="text-2xl sm:text-3xl font-bold text-gray-200 soft-neon-text">
				{status === 404 ? 'PAGE NOT FOUND' : 'SYSTEM ERROR'}
			</h2>
			<p class="text-lg text-gray-300 max-w-md mx-auto leading-relaxed">
				{status === 404
					? 'The requested page cannot be found.'
					: error?.message || 'An unexpected system error has occurred.'}
			</p>
		</div>

		<!-- Action buttons with hover effects -->
		<div class="flex justify-center items-center mt-8">
			<Button href="/" variant="primary">Return Home</Button>
		</div>

		<!-- Matrix-style decorative elements -->
		<div class="mt-12 opacity-60">
			<div class="flex justify-center space-x-4">
				<div class="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
				<div
					class="w-2 h-2 bg-green-400 rounded-full animate-pulse"
					style="animation-delay: 0.3s"
				></div>
				<div
					class="w-3 h-3 bg-green-400 rounded-full animate-ping"
					style="animation-delay: 0.6s"
				></div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Glitch effect for the 404 number */
	.glitch-text {
		text-shadow:
			0 0 10px #22c55e,
			0 0 20px #22c55e,
			0 0 30px #22c55e;
	}

	.glitch-layer-1 {
		animation: glitch 3s infinite;
		text-shadow:
			2px 0 #22c55e,
			-2px 0 #22c55e;
		opacity: 0.8;
	}

	.glitch-layer-2 {
		animation: glitch 3s infinite reverse;
		text-shadow:
			-2px 0 #22c55e,
			2px 0 #22c55e;
		opacity: 0.6;
	}

	@keyframes glitch {
		0%,
		100% {
			transform: translate(0);
		}
		20% {
			transform: translate(-2px, 2px);
		}
		40% {
			transform: translate(-2px, -2px);
		}
		60% {
			transform: translate(2px, 2px);
		}
		80% {
			transform: translate(2px, -2px);
		}
	}

	/* Softer neon text effect */
	.soft-neon-text {
		text-shadow:
			0 0 5px #22c55e,
			0 0 10px #22c55e;
	}
</style>
