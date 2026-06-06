<script>
	import { onMount } from 'svelte';
	import { tsParticles } from '@tsparticles/engine';
	import { loadSlim } from '@tsparticles/slim';
	import { loadTextShape } from '@tsparticles/shape-text';
	import { createFinancialParticleConfig } from '$lib/client/particleConfig.js';

	// Create the particle configuration using the utility
	const particlesConfig = createFinancialParticleConfig();

	onMount(async () => {
		await loadSlim(tsParticles);
		await loadTextShape(tsParticles);

		await tsParticles.load({
			id: 'tsparticles',
			options: particlesConfig
		});
	});
</script>

<div id="tsparticles"></div>
