<script>
	import { onMount } from 'svelte';
	import { tsParticles } from '@tsparticles/engine';
	import { loadSlim } from '@tsparticles/slim';
	import { loadTextShape } from '@tsparticles/shape-text';
	import { createFinancialParticleConfig } from '$lib/utils/particleConfig.js';

	// Create the particle configuration using the utility
	const particlesConfig = createFinancialParticleConfig();

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
