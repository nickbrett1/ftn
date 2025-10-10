<script>
	import { onMount, onDestroy } from 'svelte';
	import { fly, scale, fade } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';

	let mounted = $state(false);
	let canvas;
	let ctx;
	let animationId;
	let particles = [];
	let connections = [];
	let mouse = { x: 0, y: 0 };
	let hoveredNode = null;

	// Core concept nodes
	const coreNodes = [
		{ id: 'engineering', label: 'ENGINEERING', x: 0, y: 0, color: '#00FF9E', size: 80 },
		{ id: 'product', label: 'PRODUCT', x: 0, y: 0, color: '#22c55e', size: 70 },
		{ id: 'data', label: 'DATA', x: 0, y: 0, color: '#fbbf24', size: 90 },
		{ id: 'grok', label: 'GROK', x: 0, y: 0, color: '#ff0061', size: 100, isCenter: true }
	];

	// Floating particles
	const floatingParticles = Array.from({ length: 20 }, (_, i) => ({
		id: `particle-${i}`,
		x: Math.random() * 800,
		y: Math.random() * 600,
		vx: (Math.random() - 0.5) * 2,
		vy: (Math.random() - 0.5) * 2,
		size: Math.random() * 4 + 2,
		color: Math.random() > 0.5 ? '#00FF9E' : '#ff0061',
		opacity: Math.random() * 0.6 + 0.2
	}));

	onMount(() => {
		mounted = true;
		canvas = document.getElementById('network-canvas');
		if (canvas) {
			ctx = canvas.getContext('2d');
			setupCanvas();
			positionNodes();
			animate();
		}
	});

	onDestroy(() => {
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
	});

	function setupCanvas() {
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * window.devicePixelRatio;
		canvas.height = rect.height * window.devicePixelRatio;
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		canvas.style.width = rect.width + 'px';
		canvas.style.height = rect.height + 'px';
	}

	function positionNodes() {
		const centerX = canvas.width / (2 * window.devicePixelRatio);
		const centerY = canvas.height / (2 * window.devicePixelRatio);
		const radius = 200;

		coreNodes.forEach((node, index) => {
			if (node.isCenter) {
				node.x = centerX;
				node.y = centerY;
			} else {
				const angle = (index * 2 * Math.PI) / (coreNodes.length - 1);
				node.x = centerX + Math.cos(angle) * radius;
				node.y = centerY + Math.sin(angle) * radius;
			}
		});

		particles = [...coreNodes, ...floatingParticles];
	}

	function animate() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// Update floating particles
		floatingParticles.forEach(particle => {
			particle.x += particle.vx;
			particle.y += particle.vy;
			
			// Bounce off edges
			if (particle.x < 0 || particle.x > canvas.width / window.devicePixelRatio) {
				particle.vx *= -1;
			}
			if (particle.y < 0 || particle.y > canvas.height / window.devicePixelRatio) {
				particle.vy *= -1;
			}
		});

		// Draw connections
		drawConnections();
		
		// Draw particles
		particles.forEach(particle => {
			drawParticle(particle);
		});

		animationId = requestAnimationFrame(animate);
	}

	function drawConnections() {
		ctx.strokeStyle = 'rgba(0, 255, 158, 0.3)';
		ctx.lineWidth = 1;

		// Connect core nodes
		coreNodes.forEach((node, i) => {
			coreNodes.slice(i + 1).forEach(otherNode => {
				const distance = Math.sqrt(
					Math.pow(node.x - otherNode.x, 2) + 
					Math.pow(node.y - otherNode.y, 2)
				);
				
				if (distance < 300) {
					ctx.beginPath();
					ctx.moveTo(node.x, node.y);
					ctx.lineTo(otherNode.x, otherNode.y);
					ctx.stroke();
				}
			});
		});

		// Connect floating particles to nearby nodes
		floatingParticles.forEach(particle => {
			coreNodes.forEach(node => {
				const distance = Math.sqrt(
					Math.pow(particle.x - node.x, 2) + 
					Math.pow(particle.y - node.y, 2)
				);
				
				if (distance < 150) {
					ctx.strokeStyle = `rgba(0, 255, 158, ${0.2 * (1 - distance / 150)})`;
					ctx.beginPath();
					ctx.moveTo(particle.x, particle.y);
					ctx.lineTo(node.x, node.y);
					ctx.stroke();
				}
			});
		});
	}

	function drawParticle(particle) {
		ctx.save();
		
		// Glow effect
		ctx.shadowColor = particle.color;
		ctx.shadowBlur = 20;
		
		// Main circle
		ctx.fillStyle = particle.color;
		ctx.globalAlpha = particle.opacity || 1;
		ctx.beginPath();
		ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
		ctx.fill();
		
		// Label for core nodes
		if (particle.label) {
			ctx.fillStyle = '#ffffff';
			ctx.font = 'bold 14px Arial';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.globalAlpha = 1;
			ctx.fillText(particle.label, particle.x, particle.y + particle.size + 20);
		}
		
		ctx.restore();
	}

	function handleMouseMove(event) {
		const rect = canvas.getBoundingClientRect();
		mouse.x = event.clientX - rect.left;
		mouse.y = event.clientY - rect.top;
		
		// Check for hover
		hoveredNode = null;
		coreNodes.forEach(node => {
			const distance = Math.sqrt(
				Math.pow(mouse.x - node.x, 2) + 
				Math.pow(mouse.y - node.y, 2)
			);
			if (distance < node.size) {
				hoveredNode = node;
			}
		});
	}

	function handleClick(event) {
		if (hoveredNode) {
			// Animate the network
			coreNodes.forEach(node => {
				if (node !== hoveredNode) {
					const angle = Math.atan2(node.y - hoveredNode.y, node.x - hoveredNode.x);
					node.x += Math.cos(angle) * 20;
					node.y += Math.sin(angle) * 20;
				}
			});
		}
	}
</script>

<div class="flex justify-center items-center grow">
	<div class="text-white max-w-6xl w-full px-4">
		{#if mounted}
			<!-- Main Question -->
			<div 
				class="text-center mb-8"
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

			<!-- Interactive Network Canvas -->
			<div 
				class="relative bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-white/10 overflow-hidden"
				in:fly={{ y: 30, delay: 600, duration: 1000, easing: backOut }}
			>
				<canvas
					id="network-canvas"
					class="w-full h-96 cursor-pointer"
					onmousemove={handleMouseMove}
					onclick={handleClick}
				></canvas>

				<!-- Instructions -->
				<div class="text-center mt-4 text-gray-300 text-sm">
					<p>Click on nodes to see the network respond • Hover to explore connections</p>
				</div>

				<!-- Hover Info -->
				{#if hoveredNode}
					<div 
						class="absolute top-4 right-4 bg-black/90 text-white px-4 py-2 rounded-lg text-sm font-medium"
						in:scale={{ duration: 200, easing: quintOut }}
					>
						<div class="font-bold text-emerald-400">{hoveredNode.label}</div>
						<div class="text-xs text-gray-300">
							{#if hoveredNode.isCenter}
								The core concept that connects everything
							{:else if hoveredNode.id === 'engineering'}
								Building robust, scalable systems
							{:else if hoveredNode.id === 'product'}
								Creating user-focused solutions
							{:else if hoveredNode.id === 'data'}
								Extracting insights from information
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Data Flow Visualization -->
			<div 
				class="mt-8 flex justify-center"
				in:fade={{ delay: 1200, duration: 800 }}
			>
				<div class="flex items-center space-x-6 text-sm text-gray-400">
					<div class="flex items-center space-x-2">
						<div class="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
						<span>Engineering</span>
					</div>
					<div class="w-8 h-0.5 bg-gradient-to-r from-emerald-400 to-transparent"></div>
					<div class="flex items-center space-x-2">
						<div class="w-3 h-3 bg-green-400 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
						<span>Product</span>
					</div>
					<div class="w-8 h-0.5 bg-gradient-to-r from-green-400 to-transparent"></div>
					<div class="flex items-center space-x-2">
						<div class="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
						<span>Data</span>
					</div>
					<div class="w-8 h-0.5 bg-gradient-to-r from-yellow-400 to-transparent"></div>
					<div class="flex items-center space-x-2">
						<div class="w-3 h-3 bg-red-400 rounded-full animate-pulse" style="animation-delay: 0.6s"></div>
						<span>GROK</span>
					</div>
				</div>
			</div>

			<!-- Call to Action -->
			<div 
				class="text-center mt-12"
				in:fade={{ delay: 1500, duration: 800 }}
			>
				<button class="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25">
					Connect with the Data
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