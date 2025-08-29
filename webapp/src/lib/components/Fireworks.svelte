<script>
	import { onMount, onDestroy } from 'svelte';

	/** @type {boolean} */
	let { show = false } = $props();

	let canvas = $state();
	let ctx = $state();
	let animationId = $state();
	let particles = $state([]);
	let isAnimating = $state(false);

	// Firework particle class
	class Particle {
		constructor(x, y, color) {
			this.x = x;
			this.y = y;
			this.vx = (Math.random() - 0.5) * 8;
			this.vy = (Math.random() - 0.5) * 8;
			this.color = color;
			this.life = 1.0;
			this.decay = Math.random() * 0.015 + 0.01;
			this.size = Math.random() * 3 + 1;
		}

		update() {
			this.x += this.vx;
			this.y += this.vy;
			this.vy += 0.1; // gravity
			this.life -= this.decay;
			this.size *= 0.99;
		}

		draw(ctx) {
			ctx.save();
			ctx.globalAlpha = this.life;
			ctx.fillStyle = this.color;
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		isDead() {
			return this.life <= 0 || this.size <= 0.1;
		}
	}

	// Firework class
	class Firework {
		constructor(x, y, targetX, targetY) {
			this.x = x;
			this.y = y;
			this.targetX = targetX;
			this.targetY = targetY;
			this.speed = 2;
			this.exploded = false;
			this.particles = [];
			
			// Calculate direction
			const dx = targetX - x;
			const dy = targetY - y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			this.vx = (dx / distance) * this.speed;
			this.vy = (dy / distance) * this.speed;
		}

		update() {
			if (!this.exploded) {
				this.x += this.vx;
				this.y += this.vy;
				
				// Check if reached target
				const dx = this.targetX - this.x;
				const dy = this.targetY - this.y;
				if (Math.sqrt(dx * dx + dy * dy) < 5) {
					this.explode();
				}
			} else {
				// Update particles
				this.particles = this.particles.filter(particle => {
					particle.update();
					return !particle.isDead();
				});
			}
		}

		explode() {
			this.exploded = true;
			const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
			
			// Create explosion particles
			for (let i = 0; i < 30; i++) {
				const color = colors[Math.floor(Math.random() * colors.length)];
				this.particles.push(new Particle(this.x, this.y, color));
			}
		}

		draw(ctx) {
			if (!this.exploded) {
				// Draw firework trail
				ctx.save();
				ctx.fillStyle = '#ffffff';
				ctx.beginPath();
				ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			} else {
				// Draw particles
				this.particles.forEach(particle => particle.draw(ctx));
			}
		}

		isDead() {
			return this.exploded && this.particles.length === 0;
		}
	}

	let fireworks = [];

	function createFirework() {
		if (!canvas) return;
		
		const startX = Math.random() * canvas.width;
		const startY = canvas.height;
		const targetX = Math.random() * canvas.width;
		const targetY = Math.random() * canvas.height * 0.6;
		
		fireworks.push(new Firework(startX, startY, targetX, targetY));
	}

	function animate() {
		if (!isAnimating || !ctx) return;
		
		// Clear canvas
		ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		// Update and draw fireworks
		fireworks = fireworks.filter(firework => {
			firework.update();
			firework.draw(ctx);
			return !firework.isDead();
		});
		
		// Create new fireworks occasionally
		if (Math.random() < 0.1 && fireworks.length < 5) {
			createFirework();
		}
		
		animationId = requestAnimationFrame(animate);
	}

	function startFireworks() {
		if (isAnimating || !canvas || !ctx) return;
		
		isAnimating = true;
		fireworks = [];
		
		// Create initial fireworks
		for (let i = 0; i < 3; i++) {
			setTimeout(() => createFirework(), i * 200);
		}
		
		animate();
		
		// Stop after 5 seconds
		setTimeout(() => {
			stopFireworks();
		}, 5000);
	}

	function stopFireworks() {
		isAnimating = false;
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
		// Clear canvas
		if (ctx && canvas) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
		fireworks = [];
	}

	// Watch for show prop changes
	$effect(() => {
		if (show) {
			startFireworks();
		} else {
			stopFireworks();
		}
	});

	onMount(() => {
		if (canvas) {
			ctx = canvas.getContext('2d');
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
	});

	onDestroy(() => {
		stopFireworks();
	});
</script>

{#if show}
	<div class="fixed inset-0 pointer-events-none z-50">
		<canvas bind:this={canvas} class="w-full h-full"></canvas>
	</div>
{/if}