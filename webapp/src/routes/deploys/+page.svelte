<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { formatDate } from '$lib/utils/date-utils.js';

	let deployments = [];
	let loading = true;
	let error = null;
	let lastUpdated = null;
	let autoRefreshInterval = null;
	let fetchingWorkerInfo = false;

	async function fetchDeployments() {
		try {
			const response = await fetch('/api/deploys');
			if (response.ok) {
				deployments = await response.json();
				await fetchWorkerInfoForDeployments();
				lastUpdated = new Date();
				updatePageUrl();
			} else {
				error = `Failed to fetch deployments: ${response.status} ${response.statusText}`;
			}
		} catch (error_) {
			error = 'Error fetching deployments: ' + error_.message;
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		startAutoRefresh();
		await requestNotificationPermission();
		await fetchDeployments();
	});

	onDestroy(() => {
		stopAutoRefresh();
	});

	function handleFetchError(error_) {
		if (error_.name === 'TypeError' && error_.message.includes('Failed to fetch')) {
			if (error_.message.includes('CORS')) {
				return 'CORS error: Worker does not allow cross-origin requests';
			}
			if (error_.message.includes('net::ERR_CONNECTION_REFUSED')) {
				return 'Connection refused: Worker may be down or endpoint not available';
			}
			return 'Network error: Unable to reach worker';
		}
		return `Failed to fetch worker info: ${error_.message}`;
	}

	async function fetchWorkerInfoForDeployments() {
		fetchingWorkerInfo = true;
		try {
			for (const deployment of deployments) {
				if (deployment.workerInfo || deployment.workerInfoError || !deployment.url) {
					continue;
				}

				try {
					const deploymentInfoUrl = `${deployment.url}/api/deployment-info`;
					const response = await fetch(deploymentInfoUrl, {
						method: 'GET',
						headers: { Accept: 'application/json' }
					});

					if (response.ok) {
						deployment.workerInfo = await response.json();
					} else {
						deployment.workerInfoError = `Failed to fetch worker info: ${response.status} ${response.statusText}`;
					}
				} catch (error_) {
					deployment.workerInfoError = handleFetchError(error_);
				}
			}
		} finally {
			fetchingWorkerInfo = false;
		}
	}

	function startAutoRefresh() {
		autoRefreshInterval = setInterval(
			async () => {
				try {
					const response = await fetch('/api/deploys');
					if (response.ok) {
						const newDeployments = await response.json();
						deployments = newDeployments.map((newDeployment) => {
							const existingDeployment = deployments.find((d) => d.name === newDeployment.name);
							return {
								...newDeployment,
								workerInfo: existingDeployment?.workerInfo || null,
								workerInfoError: existingDeployment?.workerInfoError || null
							};
						});
						await fetchWorkerInfoForDeployments();
						lastUpdated = new Date();
						updatePageUrl();
					}
				} catch {
					// Auto-refresh error handled silently
				}
			},
			5 * 60 * 1000
		);
	}

	function stopAutoRefresh() {
		if (autoRefreshInterval) {
			clearInterval(autoRefreshInterval);
			autoRefreshInterval = null;
		}
	}

	async function requestNotificationPermission() {
		if ('Notification' in globalThis && Notification.permission === 'default') {
			await Notification.requestPermission();
		}
	}

	function updatePageUrl() {
		if (!loading && !error && deployments.length > 0) {
			const url = new URL(globalThis.location);
			url.searchParams.set('deployments', deployments.length.toString());
			globalThis.history.replaceState({}, '', url);
			document.title = `🚀 ${deployments.length} Deployments - Fintech Nick`;
		}
	}

	function getStatusColor(status) {
		const colors = {
			active: 'text-green-400',
			deploying: 'text-yellow-400',
			failed: 'text-red-400'
		};
		return colors[status] || 'text-gray-400';
	}

	function getDetailedTimeDifference(timestamp) {
		if (!timestamp) return '';
		const diffInMinutes = Math.floor((Date.now() - new Date(timestamp)) / (1000 * 60));

		if (diffInMinutes < 1) return 'just now';
		if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;

		const diffInHours = Math.floor(diffInMinutes / 60);
		if (diffInHours < 24) {
			const remainingMinutes = diffInMinutes % 60;
			if (remainingMinutes === 0) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
			return `${diffInHours} hour${
				diffInHours === 1 ? '' : 's'
			} ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} ago`;
		}

		const diffInDays = Math.floor(diffInHours / 24);
		return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
	}
</script>

<svelte:head>
	<title>Deployments - Fintech Nick</title>
	<meta name="description" content="View all active deployments and preview environments." />
	<meta
		name="deployment:status"
		content={loading ? 'loading' : error ? 'error' : deployments.length > 0 ? 'active' : 'empty'}
	/>
	<meta property="og:title" content="Deployments - Fintech Nick" />
	<meta property="og:description" content="View all active deployments and preview environments." />
	<link
		rel="icon"
		href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>"
	/>
</svelte:head>

<Header />

<div class="min-h-screen bg-base-900 text-white">
	<div class="container mx-auto px-4 py-8 pb-4">
		<div class="mb-6">
			<h1 class="text-4xl font-bold text-green-400 mb-2">Deployments</h1>
			<p class="text-xl text-gray-300">Active deployments and preview environments</p>
			{#if lastUpdated}
				<p class="text-sm text-gray-400 mt-2">
					🔄 Auto-refresh active • Last updated: {formatDate(lastUpdated)} ({getDetailedTimeDifference(
						lastUpdated
					)})
				</p>
			{/if}
			{#if fetchingWorkerInfo}
				<p class="text-sm text-blue-400 mt-2">🔍 Fetching deployment details from workers...</p>
			{/if}
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
						<p class="mb-4">
							To view real deployment data, you need to set these environment variables:
						</p>
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
			<div class="grid gap-4">
				{#each deployments as deployment}
					<div
						class="bg-gray-800/20 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors"
					>
						<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<h3 class="text-xl font-semibold text-white">
										{deployment.name}
									</h3>
									<span
										class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(
											deployment.status
										)} bg-gray-800"
									>
										{deployment.status}
									</span>
									{#if deployment.environment}
										<span
											class="px-2 py-1 text-xs font-medium rounded-full bg-blue-600 text-blue-100"
										>
											{deployment.environment}
										</span>
									{/if}
								</div>

								{#if deployment.workerInfo?.gitBranch}
									<p class="text-gray-400 mb-2">
										🌿 Branch: <span class="font-mono text-sm"
											>{deployment.workerInfo.gitBranch}</span
										>
									</p>
								{/if}

								{#if deployment.workerInfo?.gitCommit}
									<p class="text-gray-400 mb-2">
										🔢 Commit: <span class="font-mono text-sm"
											>{deployment.workerInfo.gitCommit}</span
										>
									</p>
								{/if}

								{#if deployment.workerInfo?.lastUpdated}
									<p class="text-green-400 text-sm">
										🚀 Last Updated: {formatDate(deployment.workerInfo.lastUpdated)}
									</p>
									<p class="text-green-500 text-xs">
										⏰ {getDetailedTimeDifference(deployment.workerInfo.lastUpdated)}
									</p>
								{/if}

								{#if deployment.workerInfoError}
									<p class="text-orange-500 text-xs">
										⚠️ {deployment.workerInfoError}
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
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
											/>
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
