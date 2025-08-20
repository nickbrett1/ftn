<script>
	import { onMount } from 'svelte';

	let isVisible = true;

	function toggleVisibility() {
		isVisible = !isVisible;
	}
</script>

<div class="bg-black bg-opacity-90 rounded-lg p-4 border border-zinc-700 shadow-2xl backdrop-blur-sm min-w-48">
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-white font-bold text-sm">Market Legend</h3>
		<button
			onclick={toggleVisibility}
			class="text-zinc-400 hover:text-white transition-colors"
		>
			{isVisible ? '−' : '+'}
		</button>
	</div>
	
	{#if isVisible}
		<div class="space-y-3">
			<!-- Instrument Types -->
			<div class="space-y-2">
				<div class="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Instrument Types</div>
				
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 bg-blue-400 rounded-sm"></div>
					<span class="text-xs text-zinc-400">Stock</span>
				</div>
				
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 bg-purple-400 rounded-full"></div>
					<span class="text-xs text-zinc-400">Bond</span>
				</div>
				
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 bg-yellow-400 rounded-sm"></div>
					<span class="text-xs text-zinc-400">Crypto</span>
				</div>
				
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 bg-cyan-400 rounded-sm"></div>
					<span class="text-xs text-zinc-400">Forex</span>
				</div>
			</div>
			
			<!-- Performance Indicators -->
			<div class="space-y-2">
				<div class="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Performance</div>
				
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
					<span class="text-xs text-zinc-400">Positive Change</span>
				</div>
				
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
					<span class="text-xs text-zinc-400">Negative Change</span>
				</div>
			</div>
			
			<!-- Size Indicators -->
			<div class="space-y-2">
				<div class="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Size = Volume</div>
				
				<div class="flex items-center gap-2">
					<div class="w-2 h-2 bg-zinc-500 rounded-full"></div>
					<span class="text-xs text-zinc-400">Low Volume</span>
				</div>
				
				<div class="flex items-center gap-2">
					<div class="w-4 h-4 bg-zinc-400 rounded-full"></div>
					<span class="text-xs text-zinc-400">High Volume</span>
				</div>
			</div>
			
			<!-- Controls -->
			<div class="pt-2 border-t border-zinc-700">
				<div class="text-xs text-zinc-500">
					💡 Hover over instruments for details<br/>
					🔄 Auto-rotating • Drag to control
				</div>
			</div>
		</div>
	{/if}
</div>