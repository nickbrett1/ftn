<script>
	import Header from '$lib/components/Header.svelte';
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
		
		<div class="w-full h-[80vh] bg-black rounded-lg overflow-hidden border border-zinc-700 shadow-2xl flex items-center justify-center">
			<div class="text-center text-white">
				<div class="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
				<p class="text-lg mb-2">3D Heatmap Coming Soon</p>
				<p class="text-sm text-zinc-400">Component development in progress</p>
			</div>
		</div>
		
		<div class="mt-8 text-center">
			<p class="text-zinc-400 text-sm">
				💡 View automatically rotates • Columns show price changes • Grouped by sector
			</p>
		</div>
		
		<!-- Legend -->
		<div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
			<div class="bg-black bg-opacity-80 rounded-lg p-6 border border-zinc-700">
				<h3 class="text-lg font-bold text-green-400 mb-4">Positive Changes (Green)</h3>
				<div class="space-y-2 text-sm text-zinc-300">
					<div>Column height = Price change percentage</div>
					<div>Column area = Market capitalization</div>
					<div>Green intensity = Higher positive change</div>
				</div>
			</div>
			
			<div class="bg-black bg-opacity-80 rounded-lg p-6 border border-zinc-700">
				<h3 class="text-lg font-bold text-red-400 mb-4">Negative Changes (Red)</h3>
				<div class="space-y-2 text-sm text-zinc-300">
					<div>Column height = Price change percentage</div>
					<div>Column area = Market capitalization</div>
					<div>Red intensity = Higher negative change</div>
				</div>
			</div>
		</div>
	</div>
</div>
