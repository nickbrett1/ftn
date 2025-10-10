<script>
	import { onMount, onDestroy } from 'svelte';
	import { fly, scale, fade } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';

	let mounted = $state(false);
	let currentText = $state('');
	let currentIndex = $state(0);
	let isDeleting = $state(false);
	let isWaiting = $state(false);
	let typingSpeed = $state(100);
	let waitingTime = $state(2000);
	let particleEffects = $state([]);

	const texts = [
		'Do you GROK engineering product data?',
		'Do you UNDERSTAND engineering product data?',
		'Do you COMPREHEND engineering product data?',
		'Do you MASTER engineering product data?',
		'Do you ANALYZE engineering product data?',
		'Do you TRANSFORM engineering product data?',
		'Do you VISUALIZE engineering product data?',
		'Do you GROK engineering product data?'
	];

	let currentTextIndex = $state(0);
	let intervalId;

	onMount(() => {
		mounted = true;
		startTyping();
	});

	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});

	function startTyping() {
		intervalId = setInterval(() => {
			const fullText = texts[currentTextIndex];
			
			if (isDeleting) {
				// Deleting characters
				currentText = fullText.substring(0, currentText.length - 1);
				typingSpeed = 50;
				
				if (currentText === '') {
					isDeleting = false;
					currentTextIndex = (currentTextIndex + 1) % texts.length;
					typingSpeed = 100;
				}
			} else {
				// Typing characters
				currentText = fullText.substring(0, currentIndex + 1);
				currentIndex++;
				typingSpeed = 100;
				
				// Create particle effect for each character
				if (currentIndex % 3 === 0) {
					createParticleEffect();
				}
				
				if (currentText === fullText) {
					isWaiting = true;
					setTimeout(() => {
						isWaiting = false;
						isDeleting = true;
						currentIndex = fullText.length;
					}, waitingTime);
				}
			}
		}, typingSpeed);
	}

	function createParticleEffect() {
		const particle = {
			id: Math.random(),
			x: Math.random() * window.innerWidth,
			y: Math.random() * window.innerHeight,
			vx: (Math.random() - 0.5) * 4,
			vy: (Math.random() - 0.5) * 4,
			life: 1,
			decay: 0.02,
			color: Math.random() > 0.5 ? '#00FF9E' : '#ff0061',
			size: Math.random() * 4 + 2
		};
		
		particleEffects = [...particleEffects, particle];
		
		// Animate particle
		const animateParticle = () => {
			particle.x += particle.vx;
			particle.y += particle.vy;
			particle.life -= particle.decay;
			
			if (particle.life > 0) {
				requestAnimationFrame(animateParticle);
			} else {
				particleEffects = particleEffects.filter(p => p.id !== particle.id);
			}
		};
		
		requestAnimationFrame(animateParticle);
	}

	function getHighlightedText() {
		const fullText = texts[currentTextIndex];
		const beforeHighlight = fullText.substring(0, fullText.indexOf(' '));
		const highlightWord = fullText.substring(fullText.indexOf(' ') + 1, fullText.lastIndexOf(' '));
		const afterHighlight = fullText.substring(fullText.lastIndexOf(' '));
		
		return { beforeHighlight, highlightWord, afterHighlight };
	}
</script>

<div class="flex justify-center items-center grow relative overflow-hidden">
	<!-- Particle Effects -->
	{#each particleEffects as particle (particle.id)}
		<div
			class="absolute pointer-events-none"
			style="
				left: {particle.x}px;
				top: {particle.y}px;
				width: {particle.size}px;
				height: {particle.size}px;
				background-color: {particle.color};
				border-radius: 50%;
				opacity: {particle.life};
				transform: scale({particle.life});
			"
		></div>
	{/each}

	<div class="text-white max-w-6xl w-full px-4 text-center">
		{#if mounted}
			<!-- Main Typing Animation -->
			<div 
				class="mb-8"
				in:fly={{ y: 50, delay: 200, duration: 800, easing: backOut }}
			>
				<h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight">
					<span class="text-white">{getHighlightedText().beforeHighlight}</span>
					<span class="relative inline-block mx-2">
						<span 
							class="bg-gradient-to-r from-emerald-300 via-green-400 to-emerald-500 text-transparent bg-clip-text glitch"
							data-text={getHighlightedText().highlightWord}
						>
							{getHighlightedText().highlightWord}
						</span>
						{#if !isWaiting}
							<span class="animate-pulse text-emerald-400">|</span>
						{/if}
					</span>
					<span class="text-white">{getHighlightedText().afterHighlight}</span>
				</h1>
			</div>

			<!-- Data Processing Visualization -->
			<div 
				class="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-8"
				in:fly={{ y: 30, delay: 600, duration: 1000, easing: backOut }}
			>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
					<!-- Data Input -->
					<div class="text-center">
						<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
						</div>
						<h3 class="text-lg font-bold text-emerald-400 mb-2">Raw Data</h3>
						<p class="text-gray-300 text-sm">Unstructured information flowing in</p>
					</div>

					<!-- Processing -->
					<div class="text-center">
						<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
							<svg class="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
							</svg>
						</div>
						<h3 class="text-lg font-bold text-emerald-400 mb-2">Processing</h3>
						<p class="text-gray-300 text-sm">AI algorithms analyzing patterns</p>
					</div>

					<!-- Insights -->
					<div class="text-center">
						<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
							</svg>
						</div>
						<h3 class="text-lg font-bold text-emerald-400 mb-2">Insights</h3>
						<p class="text-gray-300 text-sm">Actionable intelligence extracted</p>
					</div>
				</div>

				<!-- Data Flow Animation -->
				<div class="mt-8 flex justify-center">
					<div class="flex items-center space-x-4">
						{#each Array(8) as _, i}
							<div 
								class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"
								style="animation-delay: {i * 0.1}s"
							></div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Interactive Elements -->
			<div 
				class="flex flex-wrap justify-center gap-4"
				in:fade={{ delay: 1200, duration: 800 }}
			>
				<button class="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25">
					Start Analysis
				</button>
				<button class="border-2 border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105">
					View Examples
				</button>
			</div>

			<!-- Status Indicator -->
			<div 
				class="mt-8 text-center"
				in:fade={{ delay: 1500, duration: 800 }}
			>
				<div class="inline-flex items-center space-x-2 text-sm text-gray-400">
					<div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
					<span>System Status: Active</span>
				</div>
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