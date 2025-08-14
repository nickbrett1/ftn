<script>
	import Header from '$lib/components/Header.svelte';
	import Heatmap3D from '$lib/components/Heatmap3D.svelte';
</script>

<div class="min-h-screen bg-zinc-900">
	<Header />
	<div class="container mx-auto px-4 py-8">
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-white mb-4 [text-shadow:_0_0_15px_#fff,_0_0_20px_#0fa,_0_0_30px_#0fa,_0_0_40px_#0fa,_0_0_80px_#0fa,_0_0_90px_#0fa,_0_0_100px_#0fa,_0_0_150px_#0fa]">
				S&P 500 3D Heatmap
			</h1>
			<p class="text-xl text-zinc-300 max-w-3xl mx-auto">
				Interactive 3D visualization of S&P 500 price changes grouped by sector. 
				Column height represents percentage change, area represents market cap.
			</p>
		</div>
		
		<div class="w-full h-[80vh] bg-black rounded-lg overflow-hidden border border-zinc-700 shadow-2xl">
			<Heatmap3D />
		</div>
		
		<div class="mt-8 text-center">
			<p class="text-zinc-400 text-sm">
				💡 Drag to rotate • Scroll to zoom • Hover for details
			</p>
		</div>
	</div>
</div>
