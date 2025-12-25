<script>
	import DataArchitecture3D from './DataArchitecture3D.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>3D Data Architecture Diagram</title>
</svelte:head>

<div class="h-screen w-screen flex flex-col bg-zinc-900 overflow-hidden">
	<Header />
	<main class="flex-1 relative w-full h-full">
		<DataArchitecture3D />
	</main>
	<Footer />
</div>
