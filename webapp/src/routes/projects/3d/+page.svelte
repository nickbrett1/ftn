<script>
	import { browser } from '$app/environment';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import TechStackArchitecture from '$lib/components/TechStackArchitecture.svelte';
</script>

<div class="min-h-screen bg-zinc-900">
	<Header />
	<div class="container mx-auto px-4 py-8">
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-white mb-4 [text-shadow:_0_0_15px_#fff,_0_0_20px_#0fa,_0_0_30px_#0fa,_0_0_40px_#0fa,_0_0_80px_#0fa,_0_0_90px_#0fa,_0_0_100px_#0fa,_0_0_150px_#0fa]">
				Modern Tech Stack Architecture
			</h1>
			<p class="text-xl text-zinc-300 max-w-3xl mx-auto">
				Interactive 3D visualization of the full-stack architecture powering this fintech portfolio. 
				Explore the layers of modern web technologies, from reactive frontend to edge computing backend.
			</p>
		</div>
		
		<div class="w-full h-[80vh] bg-black rounded-lg overflow-hidden border border-zinc-700 shadow-2xl">
			{#if browser}
				<TechStackArchitecture />
			{:else}
				<div class="w-full h-full flex items-center justify-center">
					<div class="text-center text-white">
						<div class="w-16 h-16 border-4 border-blue-400 border-t-transparent animate-spin mx-auto mb-4"></div>
						<div class="text-lg mb-2">Loading Architecture</div>
						<div class="text-sm text-zinc-400">Please wait while the 3D components initialize...</div>
					</div>
				</div>
			{/if}
		</div>
		
		<div class="mt-8 text-center">
			<p class="text-zinc-400 text-sm">
				💡 Hover over components for details • Drag to rotate • Scroll to zoom • Auto-rotating architecture
			</p>
		</div>
	</div>
	
	<Footer />
</div>
