<script>
	import { onMount } from 'svelte';
</script>

<div class="bg-black bg-opacity-90 rounded-lg p-4 border border-zinc-700 shadow-lg text-white min-w-64">
	<h3 class="text-lg font-bold text-green-400 mb-4 text-center [text-shadow:_0_0_10px_#0fa]">
		Market Heatmap Legend
	</h3>
	
	<!-- Color scale for positive changes -->
	<div class="mb-4">
		<div class="text-sm font-semibold text-green-400 mb-2">Positive Changes (Green)</div>
		<div class="flex items-center gap-2 mb-2">
			<div class="w-4 h-4 bg-green-600 rounded"></div>
			<span class="text-xs">0% to 2%</span>
		</div>
		<div class="flex items-center gap-2 mb-2">
			<div class="w-4 h-4 bg-green-500 rounded"></div>
			<span class="text-xs">2% to 5%</span>
		</div>
		<div class="flex items-center gap-2 mb-2">
			<div class="w-4 h-4 bg-green-400 rounded"></div>
			<span class="text-xs">5% to 10%</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="w-4 h-4 bg-green-300 rounded"></div>
			<span class="text-xs">10%+</span>
		</div>
	</div>
	
	<!-- Color scale for negative changes -->
	<div class="mb-4">
		<div class="text-sm font-semibold text-red-400 mb-2">Negative Changes (Red)</div>
		<div class="flex items-center gap-2 mb-2">
			<div class="w-4 h-4 bg-red-600 rounded"></div>
			<span class="text-xs">0% to -2%</span>
		</div>
		<div class="flex items-center gap-2 mb-2">
			<div class="w-4 h-4 bg-red-500 rounded"></div>
			<span class="text-xs">-2% to -5%</span>
		</div>
		<div class="flex items-center gap-2 mb-2">
			<div class="w-4 h-4 bg-red-400 rounded"></div>
			<span class="text-xs">-5% to -10%</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="w-4 h-4 bg-red-300 rounded"></div>
			<span class="text-xs">-10%+</span>
		</div>
	</div>
	
	<!-- Visual elements explanation -->
	<div class="border-t border-zinc-600 pt-3">
		<div class="text-xs text-zinc-400 space-y-1">
			<div class="flex items-center gap-2">
				<div class="w-3 h-3 bg-zinc-600 rounded"></div>
				<span>Column Height = Price Change %</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="w-3 h-3 bg-zinc-600 rounded"></div>
				<span>Column Area = Market Cap</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="w-3 h-3 bg-zinc-600 rounded"></div>
				<span>Grouped by Sector</span>
			</div>
		</div>
	</div>
	
	<!-- Interactive controls info -->
	<div class="border-t border-zinc-600 pt-3 mt-3">
		<div class="text-xs text-zinc-400">
			<div class="font-semibold text-zinc-300 mb-1">Controls:</div>
			<div>🖱️ Drag to rotate view</div>
			<div>🔍 Scroll to zoom</div>
			<div>👆 Hover for details</div>
		</div>
	</div>
</div>