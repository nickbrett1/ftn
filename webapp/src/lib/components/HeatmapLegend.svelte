<script>
	let isExpanded = false;
</script>

<div class="bg-black bg-opacity-90 rounded-lg p-4 border border-zinc-700 shadow-lg text-white min-w-64">
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-lg font-bold text-green-400">3D Heatmap Legend</h3>
		<button 
			onclick={() => isExpanded = !isExpanded}
			class="text-zinc-400 hover:text-white transition-colors"
		>
			{isExpanded ? '−' : '+'}
		</button>
	</div>
	
	{#if isExpanded}
		<div class="space-y-4">
			<!-- Positive Changes -->
			<div class="border-l-4 border-green-400 pl-3">
				<h4 class="font-semibold text-green-400 mb-2">Positive Changes (Green)</h4>
				<div class="space-y-1 text-sm text-zinc-300">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-green-400 rounded-full"></div>
						<span>Column height = Price change %</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-green-400 rounded-full"></div>
						<span>Column area = Market cap</span>
					</div>
					<div class="text-xs text-zinc-400">
						Higher columns = Larger price increases
					</div>
				</div>
			</div>
			
			<!-- Negative Changes -->
			<div class="border-l-4 border-red-400 pl-3">
				<h4 class="font-semibold text-red-400 mb-2">Negative Changes (Red)</h4>
				<div class="space-y-1 text-sm text-zinc-300">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-red-400 rounded-full"></div>
						<span>Column height = Price change %</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-red-400 rounded-full"></div>
						<span>Column area = Market cap</span>
					</div>
					<div class="text-xs text-zinc-400">
						Lower columns = Larger price decreases
					</div>
				</div>
			</div>
			
			<!-- Organization -->
			<div class="border-l-4 border-blue-400 pl-3">
				<h4 class="font-semibold text-blue-400 mb-2">Organization</h4>
				<div class="text-sm text-zinc-300">
					<div>• Grouped by sector</div>
					<div>• Sectors spread horizontally</div>
					<div>• Companies arranged in grid within sectors</div>
				</div>
			</div>
			
			<!-- Interactive Controls -->
			<div class="border-l-4 border-yellow-400 pl-3">
				<h4 class="font-semibold text-yellow-400 mb-2">Controls</h4>
				<div class="text-sm text-zinc-300">
					<div>🖱️ Drag to rotate view</div>
					<div>🔍 Scroll to zoom</div>
					<div>👆 Hover for details</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="text-sm text-zinc-300">
			<div class="flex items-center gap-2 mb-2">
				<span class="w-3 h-3 bg-green-400 rounded-full"></span>
				<span>Green = Positive changes</span>
			</div>
			<div class="flex items-center gap-2 mb-2">
				<span class="w-3 h-3 bg-red-400 rounded-full"></span>
				<span>Red = Negative changes</span>
			</div>
			<div class="text-xs text-zinc-400">
				Click + to expand legend
			</div>
		</div>
	{/if}
</div>