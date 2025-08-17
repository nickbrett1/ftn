<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let deployments = [];
	let loading = true;
	let error = null;
	let isAuthenticated = false;

	onMount(async () => {
		// Temporarily removed auth check for testing
		isAuthenticated = true;

		try {
			const response = await fetch('/api/deploys');
			if (response.ok) {
				deployments = await response.json();
			} else {
				// Get the detailed error message from the API response
				const errorData = await response.text();
				console.error('Deploys API error response:', errorData);
				error = `Failed to fetch deployments: ${response.status} ${response.statusText}. ${errorData}`;
			}
		} catch (err) {
			console.error('Deploys fetch error:', err);
			error = 'Error fetching deployments: ' + err.message;
		} finally {
			loading = false;
		}
	});

	function formatDate(dateString) {
		const date = new Date(dateString);
		const options = { 
			year: 'numeric', 
			month: 'long', 
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'short'
		};
		return date.toLocaleDateString('en-US', options);
	}

	function getStatusColor(status) {
		switch (status) {
			case 'active':
				return 'text-green-400';
			case 'deploying':
				return 'text-yellow-400';
			case 'failed':
				return 'text-red-400';
			default:
				return 'text-gray-400';
		}
	}
</script>

<svelte:head>
	<title>Deployments - Fintech Nick</title>
	<meta name="description" content="View all active deployments and preview environments." />
</svelte:head>

<Header />

<div class="min-h-screen bg-base-900 text-white">
	<div class="container mx-auto px-4 py-8">
		<div class="mb-8">
			<h1 class="text-4xl font-bold text-green-400 mb-2">Deployments</h1>
			<p class="text-xl text-gray-300">Active deployments and preview environments</p>
		</div>

		{#if loading}
			<div class="flex justify-center items-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
			</div>
		{:else if error}
			<div class="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
				<p class="text-red-400 text-lg mb-4">Unable to Load Deployments</p>
				{#if error.includes('Cloudflare credentials not available')}
					<div class="text-gray-400 mb-6">
						<p class="mb-2">This is expected in development environments.</p>
						<p class="mb-4">To view real deployment data, you need to set these environment variables:</p>
						<div class="bg-gray-800/50 p-3 rounded font-mono text-sm text-left">
							<div class="mb-2">CLOUDFLARE_ACCOUNT_ID</div>
							<div>CLOUDFLARE_API_TOKEN</div>
						</div>
					</div>
					<button
						onclick={() => goto('/')}
						class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
					>
						Go Home
					</button>
				{:else}
					<p class="text-gray-400 mb-4">{error}</p>
					<button
						onclick={() => goto('/')}
						class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
					>
						Go Home
					</button>
				{/if}
			</div>
		{:else if deployments.length === 0}
			<div class="bg-gray-800/20 border border-gray-700 rounded-lg p-6 text-center">
				<p class="text-gray-400 text-lg">No deployments found</p>
			</div>
		{:else}
			<div class="grid gap-6">
				{#each deployments as deployment}
					<div class="bg-gray-800/20 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
						<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<h3 class="text-xl font-semibold text-white">
										{deployment.name}
									</h3>
									<span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(deployment.status)} bg-gray-800">
										{deployment.status}
									</span>
								</div>
								
								{#if deployment.branch}
									<p class="text-gray-400 mb-2">
										🌿 Branch: <span class="font-mono text-sm">{deployment.branch}</span>
									</p>
								{/if}
								
								{#if deployment.environment}
									<p class="text-gray-400 mb-2">
										🏗️ Environment: <span class="font-mono text-sm">{deployment.environment}</span>
									</p>
								{/if}
								
								{#if deployment.version}
									<p class="text-gray-400 mb-2">
										🔢 Version: <span class="font-mono text-sm">{deployment.version}</span>
									</p>
								{/if}
								
								{#if deployment.deployedAt}
									<p class="text-gray-400 text-sm">
										📅 Deployed: {formatDate(deployment.deployedAt)}
									</p>
								{/if}
							</div>
							
							<div class="flex flex-col gap-2">
								{#if deployment.url}
									<a
										href={deployment.url}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
									>
										🔗 Visit Site
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
										</svg>
									</a>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<Footer />