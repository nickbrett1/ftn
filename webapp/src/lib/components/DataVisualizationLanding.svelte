<script>
	import { onMount } from 'svelte';
	import { fly, scale, fade } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';

	let mounted = $state(false);
	let chartData = $state([]);
	let isAnimating = $state(false);
	let hoveredBar = $state(null);

	// Sample data that represents engineering product data
	const dataPoints = [
		{ label: 'Performance', value: 87, color: '#00FF9E' },
		{ label: 'Scalability', value: 92, color: '#22c55e' },
		{ label: 'Reliability', value: 95, color: '#00FF9E' },
		{ label: 'Efficiency', value: 78, color: '#fbbf24' },
		{ label: 'Innovation', value: 88, color: '#00FF9E' },
		{ label: 'Quality', value: 91, color: '#22c55e' }
	];

	onMount(() => {
		mounted = true;
		// Animate data loading
		setTimeout(() => {
			isAnimating = true;
			chartData = dataPoints.map((point, index) => ({
				...point,
				animatedValue: 0,
				index
			}));
			
			// Animate each bar
			chartData.forEach((point, index) => {
				setTimeout(() => {
					animateValue(point, point.value, 1000);
				}, index * 150);
			});
		}, 500);
	});

	function animateValue(point, targetValue, duration) {
		const startTime = Date.now();
		const startValue = point.animatedValue;
		
		function update() {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const easedProgress = quintOut(progress);
			
			point.animatedValue = startValue + (targetValue - startValue) * easedProgress;
			
			if (progress < 1) {
				requestAnimationFrame(update);
			}
		}
		
		requestAnimationFrame(update);
	}

	function handleBarHover(index) {
		hoveredBar = index;
	}

	function handleBarLeave() {
		hoveredBar = null;
	}
</script>

<div class="flex justify-center items-center grow">
	<div class="text-white max-w-6xl w-full px-4">
		{#if mounted}
			<!-- Main Question -->
			<div 
				class="text-center mb-16"
				in:fly={{ y: 50, delay: 200, duration: 800, easing: backOut }}
			>
				<h1 class="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
					Do you 
					<span class="relative inline-block">
						<span 
							class="bg-gradient-to-r from-emerald-300 via-green-400 to-emerald-500 text-transparent bg-clip-text glitch"
							data-text="GROK"
						>
							GROK
						</span>
					</span>
					engineering product data?
				</h1>
			</div>

			<!-- Interactive Data Visualization -->
			<div 
				class="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
				in:fly={{ y: 30, delay: 600, duration: 1000, easing: backOut }}
			>
				<div class="text-center mb-8">
					<h2 class="text-2xl font-bold text-emerald-400 mb-2">Data Insights</h2>
					<p class="text-gray-300">Hover over the bars to explore the metrics</p>
				</div>

				<div class="grid grid-cols-2 md:grid-cols-3 gap-6">
					{#each chartData as point, index (point.label)}
						<div 
							class="relative group cursor-pointer"
							onmouseenter={() => handleBarHover(index)}
							onmouseleave={handleBarLeave}
						>
							<!-- Bar Container -->
							<div class="relative h-32 bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50">
								<!-- Animated Bar -->
								<div 
									class="absolute bottom-0 left-0 w-full transition-all duration-300 ease-out group-hover:shadow-lg"
									style="
										height: {point.animatedValue}%; 
										background: linear-gradient(to top, {point.color}80, {point.color});
										box-shadow: 0 0 20px {point.color}40;
									"
									in:scale={{ 
										delay: 800 + (index * 150), 
										duration: 600, 
										easing: backOut 
									}}
								>
									<!-- Glowing effect on hover -->
									{#if hoveredBar === index}
										<div 
											class="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 animate-pulse"
										></div>
									{/if}
								</div>

								<!-- Value Display -->
								<div class="absolute top-2 right-2 text-white font-bold text-sm">
									{Math.round(point.animatedValue)}%
								</div>

								<!-- Label -->
								<div class="absolute bottom-2 left-2 text-white text-xs font-medium">
									{point.label}
								</div>
							</div>

							<!-- Hover Tooltip -->
							{#if hoveredBar === index}
								<div 
									class="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap z-10"
									in:scale={{ duration: 200, easing: quintOut }}
								>
									{point.label}: {point.value}%
									<div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Data Flow Animation -->
				<div class="mt-8 flex justify-center">
					<div class="flex items-center space-x-4 text-sm text-gray-400">
						<span>Raw Data</span>
						<div class="flex space-x-1">
							{#each Array(5) as _, i}
								<div 
									class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"
									style="animation-delay: {i * 0.2}s"
								></div>
							{/each}
						</div>
						<span>Insights</span>
						<div class="flex space-x-1">
							{#each Array(3) as _, i}
								<div 
									class="w-2 h-2 bg-green-400 rounded-full animate-pulse"
									style="animation-delay: {i * 0.3}s"
								></div>
							{/each}
						</div>
						<span>Action</span>
					</div>
				</div>
			</div>

			<!-- Call to Action -->
			<div 
				class="text-center mt-12"
				in:fade={{ delay: 1500, duration: 800 }}
			>
				<button class="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25">
					Explore the Data
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.glitch:before,
	.glitch:after {
		display: inline-block;
		content: attr(data-text);
		position: absolute;
		top: 0;
		left: 0;
		opacity: 0.8;
	}

	.glitch:before {
		animation: glitch-it 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite;
		color: #ff0061;
		z-index: -1;
	}

	.glitch:after {
		animation: glitch-it 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) reverse both infinite;
		color: #ff0061;
		z-index: -2;
	}

	@keyframes glitch-it {
		0% { transform: translate(0); }
		20% { transform: translate(-2px, 2px); }
		40% { transform: translate(-2px, -2px); }
		60% { transform: translate(2px, 2px); }
		80% { transform: translate(2px, -2px); }
		to { transform: translate(0); }
	}
</style>