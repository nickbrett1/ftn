<script>
	import DataArchitectureHTML from './DataArchitectureHTML.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>Data Architecture Diagram</title>
</svelte:head>

<div class="min-h-screen bg-zinc-900 flex flex-col">
	<Header />
	<main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
		<h1 class="text-3xl font-bold text-white text-center my-8">
			Interactive Data Architecture Diagram
		</h1>
		<div class="max-w-3xl mx-auto mb-8 text-center text-gray-300 space-y-4">
			<p>
				This diagram illustrates the data flows in a modern cloud data architecture. Click on the
				components to learn more — <span class="text-purple-400 font-bold"
					>boxes marked with a purple star icon link to my portfolio projects.</span
				>
			</p>
			<p class="text-sm text-gray-400 italic">
				Note: This is a simplified view focusing on core data movements. Specific nuances like
				Machine Learning training pipelines, model retraining loops, or industry-specific compliance
				flows are omitted for clarity.
			</p>
		</div>
		<div class="diagram-wrapper">
			<DataArchitectureHTML />
		</div>
	</main>
	<Footer />
</div>

<style>
	.diagram-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
