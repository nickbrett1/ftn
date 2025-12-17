<script>
  import DataArchitectureDiagram from './DataArchitectureDiagram.svelte';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
  <title>Data Architecture Diagram</title>
</svelte:head>

<div class="min-h-screen bg-zinc-900 flex flex-col">
  <Header />
  <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
    <h1 class="text-3xl font-bold text-white text-center my-8">Interactive Data Architecture Diagram</h1>
    <p class="text-center mb-8 text-gray-300">
      This diagram illustrates the data flows in a modern cloud data architecture. Mouse over the components to learn more.
    </p>
    <div class="diagram-wrapper">
        <DataArchitectureDiagram />
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
