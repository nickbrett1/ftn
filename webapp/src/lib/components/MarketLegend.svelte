<script>
	import { onMount } from 'svelte';

	let isVisible = true;

	function toggleVisibility() {
		isVisible = !isVisible;
	}
</script>

<div
	class="bg-black bg-opacity-90 rounded-lg p-4 border border-zinc-700 shadow-2xl backdrop-blur-sm min-w-48"
>
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-white font-bold text-sm">Financial Centers Legend</h3>
		<button onclick={toggleVisibility} class="text-zinc-400 hover:text-white transition-colors">
			{isVisible ? '−' : '+'}
		</button>
	</div>

	{#if isVisible}
		<div class="space-y-3">
			<!-- Market Sentiment -->
			<div class="space-y-2">
				<div class="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
					Market Sentiment
				</div>

				<div class="flex items-center gap-2">
					<div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
					<span class="text-xs text-zinc-400">Positive Sentiment</span>
				</div>

				<div class="flex items-center gap-2">
					<div class="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
					<span class="text-xs text-zinc-400">Negative Sentiment</span>
				</div>
			</div>

			<!-- Financial Center Importance -->
			<div class="space-y-2">
				<div class="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
					Center Importance
				</div>

				<div class="flex items-center gap-2">
					<div class="w-4 h-4 bg-blue-400 rounded-full"></div>
					<span class="text-xs text-zinc-400">Tier 1 (Global)</span>
				</div>

				<div class="flex items-center gap-2">
					<div class="w-3 h-3 bg-purple-400 rounded-full"></div>
					<span class="text-xs text-zinc-400">Tier 2 (Regional)</span>
				</div>

				<div class="flex items-center gap-2">
					<div class="w-2 h-2 bg-cyan-400 rounded-full"></div>
					<span class="text-xs text-zinc-400">Tier 3 (Local)</span>
				</div>
			</div>

			<!-- Market Data Indicators -->
			<div class="space-y-2">
				<div class="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
					Market Indicators
				</div>

				<div class="flex items-center gap-2">
					<div class="w-2 h-2 bg-green-400 rounded-full"></div>
					<span class="text-xs text-zinc-400">Stocks</span>
				</div>

				<div class="flex items-center gap-2">
					<div class="w-2 h-2 bg-blue-400 rounded-full"></div>
					<span class="text-xs text-zinc-400">Bonds</span>
				</div>

				<div class="flex items-center gap-2">
					<div class="w-2 h-2 bg-yellow-400 rounded-full"></div>
					<span class="text-xs text-zinc-400">Forex</span>
				</div>

				<div class="flex items-center gap-2">
					<div class="w-2 h-2 bg-orange-400 rounded-full"></div>
					<span class="text-xs text-zinc-400">Commodities</span>
				</div>
			</div>

			<!-- Controls -->
			<div class="pt-2 border-t border-zinc-700">
				<div class="text-xs text-zinc-500">
					💡 Hover over markers for details<br />
					🌍 Auto-rotating Earth • Drag to control<br />
					⭐ 9 major financial centers
				</div>
			</div>
		</div>
	{/if}
</div>
