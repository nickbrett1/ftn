<script>
	import { onMount } from 'svelte';
	import DataVisualizationLanding from '$lib/components/DataVisualizationLanding.svelte';
	import ParticleNetworkLanding from '$lib/components/ParticleNetworkLanding.svelte';
	import TypingAnimationLanding from '$lib/components/TypingAnimationLanding.svelte';
	import Landing from '$lib/components/Landing.svelte';

	let currentDemo = $state(0);
	let mounted = $state(false);

	const demos = [
		{ name: 'Original', component: Landing, description: 'Current animated text with glitch effects' },
		{ name: 'Data Visualization', component: DataVisualizationLanding, description: 'Interactive charts and metrics' },
		{ name: 'Particle Network', component: ParticleNetworkLanding, description: 'Interactive node network with connections' },
		{ name: 'Typing Animation', component: TypingAnimationLanding, description: 'Dynamic text with particle effects' }
	];

	onMount(() => {
		mounted = true;
	});

	function switchDemo(index) {
		currentDemo = index;
	}
</script>

<svelte:head>
	<title>Landing Page Demos - Fintech Nick</title>
	<meta name="description" content="Interactive demos of different landing page alternatives" />
</svelte:head>

{#if mounted}
	<!-- Demo Selector -->
	<div class="fixed top-4 left-4 right-4 z-50 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-white/10">
		<div class="flex flex-wrap gap-2 justify-center">
			{#each demos as demo, index (demo.name)}
				<button
					class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 {currentDemo === index 
						? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' 
						: 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'}"
					onclick={() => switchDemo(index)}
				>
					{demo.name}
				</button>
			{/each}
		</div>
		<div class="text-center mt-2 text-xs text-gray-400">
			{demos[currentDemo].description}
		</div>
	</div>

	<!-- Demo Content -->
	<div class="min-h-screen bg-zinc-900">
		<svelte:component this={demos[currentDemo].component} />
	</div>

	<!-- Navigation Instructions -->
	<div class="fixed bottom-4 left-4 right-4 z-50 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-white/10">
		<div class="text-center text-sm text-gray-300">
			<p>Use the buttons above to switch between different landing page concepts</p>
			<p class="text-xs text-gray-500 mt-1">Each demo showcases different Svelte animation techniques</p>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow-x: hidden;
	}
</style>