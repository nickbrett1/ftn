<script>
	import Button from '$lib/components/Button.svelte';
	import { onMount } from 'svelte';
	import { tsParticles } from '@tsparticles/engine';
	import { loadSlim } from '@tsparticles/slim';
	import { loadTextShape } from '@tsparticles/shape-text';
	import { createErrorParticleConfig } from '$lib/utils/particleConfig.js';

	// Create the particle configuration using the utility
	const particlesConfig = createErrorParticleConfig();

	onMount(async () => {
		loadSlim(tsParticles);
		loadTextShape(tsParticles);

		tsParticles.load({
			id: 'notauthorised-particles',
			options: particlesConfig
		});
	});

	// Function to initiate Google OAuth flow
	const initiateGoogleAuth = () => {
		const GOOGLE_CLIENT_ID =
			'263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com';
		const redirectUri =
			process.env.NODE_ENV === 'development'
				? 'http://127.0.0.1:5173/auth'
				: 'https://fintechnick.com/auth';
		const scope = 'openid profile email';
		const responseType = 'code';

		const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=${responseType}`;

		window.location.href = authUrl;
	};
</script>

<svelte:head>
	<meta
		name="description"
		content="Authentication required - Some tools require login while under development"
	/>
	<title>Authentication Required</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center relative overflow-hidden">
	<!-- tsparticles background -->
	<div id="notauthorised-particles" class="absolute inset-0"></div>

	<div class="text-center space-y-8 p-8 relative z-10 max-w-3xl">
		<!-- Glitch effect title -->
		<div class="relative mb-8">
			<h1 class="text-6xl sm:text-7xl font-bold text-green-400 relative glitch-text">
				ACCESS DENIED
			</h1>
			<!-- Glitch layers -->
			<h1 class="text-6xl sm:text-7xl font-bold text-green-400 absolute inset-0 glitch-layer-1">
				ACCESS DENIED
			</h1>
			<h1 class="text-6xl sm:text-7xl font-bold text-green-400 absolute inset-0 glitch-layer-2">
				ACCESS DENIED
			</h1>
		</div>

		<!-- Main content -->
		<div class="space-y-6">
			<!-- Authentication explanation -->
			<div
				class="bg-gray-900/50 backdrop-blur-sm border border-green-400/30 rounded-lg p-6 space-y-4"
			>
				<h2 class="text-2xl sm:text-3xl font-bold text-gray-200 soft-neon-text">
					Authentication Required
				</h2>
				<p class="text-lg text-gray-300 leading-relaxed">
					Some tools on this site currently require authentication while they are under development.
				</p>
			</div>

			<!-- Information and insights section -->
			<div
				class="bg-gray-900/50 backdrop-blur-sm border border-blue-400/30 rounded-lg p-6 space-y-4"
			>
				<h3 class="text-xl font-bold text-blue-400 soft-neon-text">
					Looking for Information & Insights?
				</h3>
				<p class="text-gray-300 leading-relaxed">
					If you're interested in data engineering and modern ETL approaches, check out our
					comprehensive article on building efficient data transformation pipelines.
				</p>
				<div class="pt-2">
					<Button
						href="/projects/dbt-duckdb"
						variant="primary"
						size="lg"
						class="whitespace-normal text-center"
					>
						Read: Modern ETL with dbt & DuckDB
					</Button>
				</div>
			</div>

			<!-- Quick authentication retry -->
			<div
				class="bg-gray-900/50 backdrop-blur-sm border border-yellow-400/30 rounded-lg p-6 space-y-4"
			>
				<h3 class="text-xl font-bold text-yellow-400 soft-neon-text">Quick Re-authentication</h3>
				<p class="text-gray-300 leading-relaxed">
					If your session expired or you need to log back in, you can quickly re-authenticate here.
				</p>
				<div class="pt-2">
					<Button onclick={initiateGoogleAuth} variant="primary" size="lg">
						Try Authentication Again
					</Button>
				</div>
			</div>
		</div>

		<!-- Action buttons -->
		<div class="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
			<Button href="/" variant="primary">Return Home</Button>
		</div>

		<!-- Matrix-style decorative elements -->
		<div class="mt-12 opacity-60">
			<div class="flex justify-center space-x-4">
				<div class="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
				<div
					class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
					style="animation-delay: 0.3s"
				></div>
				<div
					class="w-3 h-3 bg-yellow-400 rounded-full animate-ping"
					style="animation-delay: 0.6s"
				></div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Glitch effect for the title */
	.glitch-text {
		text-shadow:
			0 0 10px #22c55e,
			0 0 20px #22c55e,
			0 0 30px #22c55e;
	}

	.glitch-layer-1 {
		animation: glitch 3s infinite;
		text-shadow:
			2px 0 #22c55e,
			-2px 0 #22c55e;
		opacity: 0.8;
	}

	.glitch-layer-2 {
		animation: glitch 3s infinite reverse;
		text-shadow:
			-2px 0 #22c55e,
			2px 0 #22c55e;
		opacity: 0.6;
	}

	@keyframes glitch {
		0%,
		100% {
			transform: translate(0);
		}
		20% {
			transform: translate(-2px, 2px);
		}
		40% {
			transform: translate(-2px, -2px);
		}
		60% {
			transform: translate(2px, 2px);
		}
		80% {
			transform: translate(2px, -2px);
		}
	}

	/* Softer neon text effect */
	.soft-neon-text {
		text-shadow:
			0 0 5px currentColor,
			0 0 10px currentColor;
	}
</style>
