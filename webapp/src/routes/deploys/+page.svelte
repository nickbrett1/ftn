<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { formatDate, formatRelativeTime } from '$lib/utils/date-utils.js';

	let deployments = [];
	let loading = true;
	let error = null;
	let isAuthenticated = false;
	let lastUpdated = null;
	let autoRefreshInterval = null;
	let refreshing = false;

	onMount(async () => {
		// Temporarily removed auth check for testing
		isAuthenticated = true;

		// Start auto-refresh
		startAutoRefresh();

		// Request notification permission
		await requestNotificationPermission();

		try {
			const response = await fetch('/api/deploys');
			if (response.ok) {
				deployments = await response.json();
				lastUpdated = new Date();
				updatePageUrl();
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

	// Cleanup on component destroy
	onDestroy(() => {
		stopAutoRefresh();
	});

	function startAutoRefresh() {
		// Refresh every 5 minutes
		autoRefreshInterval = setInterval(async () => {
			try {
				const response = await fetch('/api/deploys');
				if (response.ok) {
					deployments = await response.json();
					lastUpdated = new Date();
					updatePageUrl();
				}
			} catch (err) {
				console.error('Auto-refresh error:', err);
			}
		}, 5 * 60 * 1000); // 5 minutes
	}

	function stopAutoRefresh() {
		if (autoRefreshInterval) {
			clearInterval(autoRefreshInterval);
			autoRefreshInterval = null;
		}
	}

	async function manualRefresh() {
		if (refreshing) return;
		
		refreshing = true;
		try {
			const response = await fetch('/api/deploys');
			if (response.ok) {
				deployments = await response.json();
				lastUpdated = new Date();
				updatePageUrl();
			} else {
				const errorData = await response.text();
				error = `Failed to fetch deployments: ${response.status} ${response.statusText}. ${errorData}`;
			}
		} catch (err) {
			console.error('Manual refresh error:', err);
			error = 'Error fetching deployments: ' + err.message;
		} finally {
			refreshing = false;
		}
	}

	async function showDeploymentNotification(title, body, icon = '🚀') {
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification(title, {
				body: body,
				icon: icon,
				tag: 'deployment-update'
			});
		}
	}

	async function requestNotificationPermission() {
		if ('Notification' in window && Notification.permission === 'default') {
			const permission = await Notification.requestPermission();
			if (permission === 'granted') {
				console.log('🔔 Notification permission granted');
			}
		}
	}

	function updatePageUrl() {
		if (!loading && !error && deployments.length > 0) {
			const recentCount = deployments.filter(d => d._debug?.worker_created_on && isRecentDeployment(d._debug.worker_created_on)).length;
			const totalCount = deployments.length;
			
			const url = new URL(window.location);
			url.searchParams.set('deployments', totalCount.toString());
			url.searchParams.set('recent', recentCount.toString());
			
			window.history.replaceState({}, '', url);
			
			// Update document title dynamically
			if (recentCount > 0) {
				document.title = `🚀 ${recentCount} Recent - ${totalCount} Deployments - Fintech Nick`;
			} else {
				document.title = `✅ ${totalCount} Deployments - Fintech Nick`;
			}
			
			// Log deployment status to console
			console.log('🚀 Deployment Status Update:', {
				totalDeployments: totalCount,
				recentDeployments: recentCount,
				deployments: deployments.map(d => ({
					name: d.name,
					environment: d.environment,
					version: d.version,
					lastDeployed: d._debug?.worker_created_on ? getDetailedTimeDifference(d._debug.worker_created_on) : 'Unknown',
					health: d._debug?.worker_created_on ? getDeploymentHealth(d._debug.worker_created_on).status : 'Unknown',
					ageCategory: d._debug?.worker_created_on ? getDeploymentAgeCategory(d._debug.worker_created_on).category : 'Unknown'
				}))
			});
		}
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

	function isRecentDeployment(timestamp) {
		if (!timestamp) return false;
		const deploymentTime = new Date(timestamp);
		const now = new Date();
		const diffInHours = (now - deploymentTime) / (1000 * 60 * 60);
		return diffInHours < 1; // Less than 1 hour ago
	}

	function getDetailedTimeDifference(timestamp) {
		if (!timestamp) return '';
		const deploymentTime = new Date(timestamp);
		const now = new Date();
		const diffInMs = now - deploymentTime;
		
		const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
		const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
		
		if (diffInMinutes < 1) return 'just now';
		if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
		if (diffInHours < 24) {
			const remainingMinutes = diffInMinutes % 60;
			if (remainingMinutes === 0) {
				return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
			} else {
				return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} ago`;
			}
		}
		if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
		
		return `${diffInDays} days ago`;
	}

	function getDeploymentFreshness(timestamp) {
		if (!timestamp) return 0;
		const deploymentTime = new Date(timestamp);
		const now = new Date();
		const diffInMs = now - deploymentTime;
		
		// Consider deployments "fresh" for 24 hours
		const maxAgeMs = 24 * 60 * 60 * 1000;
		const freshness = Math.max(0, 100 - (diffInMs / maxAgeMs) * 100);
		
		return Math.round(freshness);
	}

	function getDeploymentFrequency(deployments) {
		if (!deployments || deployments.length < 2) return null;
		
		const validDeployments = deployments
			.filter(d => d._debug?.worker_created_on)
			.sort((a, b) => new Date(a._debug.worker_created_on) - new Date(b._debug.worker_created_on));
		
		if (validDeployments.length < 2) return null;
		
		const firstDeployment = new Date(validDeployments[0]._debug.worker_created_on);
		const lastDeployment = new Date(validDeployments[validDeployments.length - 1]._debug.worker_created_on);
		const totalTimeMs = lastDeployment - firstDeployment;
		const totalDays = totalTimeMs / (1000 * 60 * 60 * 24);
		
		if (totalDays < 1) return 'Multiple times today';
		if (totalDays < 7) return `${Math.round(totalDays)} days`;
		if (totalDays < 30) return `${Math.round(totalDays / 7)} weeks`;
		
		return `${Math.round(totalDays / 30)} months`;
	}

	function getDeploymentAgeCategory(timestamp) {
		if (!timestamp) return { category: 'Unknown', color: 'text-gray-400' };
		
		const deploymentTime = new Date(timestamp);
		const now = new Date();
		const diffInMs = now - deploymentTime;
		const diffInHours = diffInMs / (1000 * 60 * 60);
		const diffInDays = diffInHours / 24;
		
		if (diffInHours < 1) return { category: 'Very Fresh', color: 'text-green-400' };
		if (diffInHours < 6) return { category: 'Fresh', color: 'text-green-300' };
		if (diffInHours < 24) return { category: 'Recent', color: 'text-yellow-400' };
		if (diffInDays < 7) return { category: 'This Week', color: 'text-orange-400' };
		if (diffInDays < 30) return { category: 'This Month', color: 'text-red-400' };
		
		return { category: 'Older', color: 'text-gray-400' };
	}

	function getDeploymentHealth(timestamp) {
		if (!timestamp) return { status: 'Unknown', color: 'text-gray-400', icon: '❓' };
		
		const deploymentTime = new Date(timestamp);
		const now = new Date();
		const diffInMs = now - deploymentTime;
		const diffInHours = diffInMs / (1000 * 60 * 60);
		const diffInDays = diffInHours / 24;
		
		if (diffInHours < 1) return { status: 'Excellent', color: 'text-green-400', icon: '🟢' };
		if (diffInHours < 6) return { status: 'Good', color: 'text-green-300', icon: '🟢' };
		if (diffInHours < 24) return { status: 'Fair', color: 'text-yellow-400', icon: '🟡' };
		if (diffInDays < 7) return { status: 'Attention', color: 'text-orange-400', icon: '🟠' };
		if (diffInDays < 30) return { status: 'Warning', color: 'text-red-400', icon: '🔴' };
		
		return { status: 'Critical', color: 'text-red-600', icon: '🔴' };
	}
</script>

<svelte:head>
	<title>
		{loading ? 'Loading Deployments' : error ? 'Deployment Error' : deployments.length === 0 ? 'No Deployments' : `${deployments.length} Deployment${deployments.length > 1 ? 's' : ''}`} - Fintech Nick
	</title>
	<meta name="description" content="View all active deployments and preview environments." />
	
	<!-- Basic meta tags -->
	<meta name="deployment:status" content={loading ? 'loading' : error ? 'error' : deployments.length > 0 ? 'active' : 'empty'} />
	<meta property="og:title" content="Deployments - Fintech Nick" />
	<meta property="og:description" content="View all active deployments and preview environments." />
	
	<!-- Simple favicon -->
	<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>" />
</svelte:head>

<Header />

<div class="min-h-screen bg-base-900 text-white">
	<div class="container mx-auto px-4 py-8 pb-4">
		<div class="mb-6">
			<h1 class="text-4xl font-bold text-green-400 mb-2">Deployments</h1>
			<p class="text-xl text-gray-300">Active deployments and preview environments</p>
			{#if lastUpdated}
				<p class="text-sm text-gray-400 mt-2">
					🔄 Auto-refresh active • Last updated: {formatDate(lastUpdated)} ({getDetailedTimeDifference(lastUpdated)})
				</p>
			{/if}
			
			{#if !loading && !error && deployments.length > 0}
				{@const recentCount = deployments.filter(d => d._debug?.worker_created_on && isRecentDeployment(d._debug.worker_created_on)).length}
				{@const totalCount = deployments.length}
				{@const healthyCount = deployments.filter(d => {
					const health = getDeploymentHealth(d._debug?.worker_created_on);
					return health.status === 'Excellent' || health.status === 'Good';
				}).length}
				
				<div class="flex flex-wrap gap-3 mt-4">
					<div class="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700 rounded-lg">
						<span class="text-green-400">📊</span>
						<span class="text-green-200 font-semibold">{totalCount}</span>
						<span class="text-green-400 text-sm">Total</span>
					</div>
					
					{#if recentCount > 0}
						<div class="flex items-center gap-2 px-3 py-2 bg-yellow-900/30 border border-yellow-700 rounded-lg">
							<span class="text-yellow-400">🚀</span>
							<span class="text-yellow-200 font-semibold">{recentCount}</span>
							<span class="text-yellow-400 text-sm">Recent</span>
						</div>
					{/if}
					
					<div class="flex items-center gap-2 px-3 py-2 bg-blue-900/30 border border-blue-700 rounded-lg">
						<span class="text-blue-400">✅</span>
						<span class="text-blue-200 font-semibold">{healthyCount}</span>
						<span class="text-blue-400 text-sm">Healthy</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Deployment Info -->
		<div class="bg-gray-800/20 border border-gray-700 rounded-lg p-4 mb-6">
			<h3 class="text-gray-200 font-semibold mb-2">ℹ️ Understanding Deployment Timestamps</h3>
			<div class="text-sm text-gray-400 space-y-1">
				<p><span class="text-blue-400">🚀 Last Deployed:</span> When the worker was last deployed (most accurate)</p>
				<p><span class="text-blue-400">📅 Deployed:</span> Formatted deployment timestamp from API</p>
				<p><span class="text-blue-400">📦 Deployment Created:</span> When the specific deployment was created</p>
			</div>
		</div>

		{#if !loading && !error && deployments.length > 0}
			<!-- Quick Stats -->
			{#if deployments.filter(d => d._debug?.worker_created_on).length > 0}
				{@const mostRecentDeployment = deployments
					.filter(d => d._debug?.worker_created_on)
					.sort((a, b) => new Date(b._debug.worker_created_on) - new Date(a._debug.worker_created_on))[0]
				}
				{#if mostRecentDeployment}
					<div class="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
						<h3 class="text-blue-400 font-semibold mb-2">📈 Quick Stats</h3>
						<div class="text-sm text-blue-300 space-y-1">
							<p>
								<span class="text-blue-200">Most Recent Deployment:</span> 
								{mostRecentDeployment.name} 
								<span class="text-yellow-300">({getDetailedTimeDifference(mostRecentDeployment._debug.worker_created_on)})</span>
							</p>
							{#if getDeploymentFrequency(deployments)}
								<p>
									<span class="text-blue-200">Deployment Span:</span> 
									<span class="text-yellow-300">{getDeploymentFrequency(deployments)}</span>
								</p>
							{/if}
						</div>
					</div>
				{/if}
		{/if}

		{#if !loading && !error && deployments.length > 0}
			<!-- Deployment Health Overview -->
			{#if deployments.filter(d => d._debug?.worker_created_on).length > 0}
				{@const healthOverview = deployments
					.filter(d => d._debug?.worker_created_on)
					.map(d => getDeploymentHealth(d._debug.worker_created_on))
				}
				{@const excellentCount = healthOverview.filter(h => h.status === 'Excellent').length}
				{@const goodCount = healthOverview.filter(h => h.status === 'Good').length}
				{@const fairCount = healthOverview.filter(h => h.status === 'Fair').length}
				{@const attentionCount = healthOverview.filter(h => h.status === 'Attention').length}
				{@const warningCount = healthOverview.filter(h => h.status === 'Warning').length}
				{@const criticalCount = healthOverview.filter(h => h.status === 'Critical').length}
				
				<div class="bg-gradient-to-r from-gray-800/20 to-gray-700/20 border border-gray-600 rounded-lg p-4 mb-6">
				<h3 class="text-gray-200 font-semibold mb-3">🏥 Deployment Health Overview</h3>
				<div class="grid grid-cols-2 md:grid-cols-6 gap-3">
					{#if excellentCount > 0}
						<div class="text-center p-2 bg-green-900/30 rounded">
							<div class="text-2xl">🟢</div>
							<div class="text-sm text-green-300">{excellentCount}</div>
							<div class="text-xs text-green-400">Excellent</div>
						</div>
					{/if}
					{#if goodCount > 0}
						<div class="text-center p-2 bg-green-800/30 rounded">
							<div class="text-2xl">🟢</div>
							<div class="text-sm text-green-300">{goodCount}</div>
							<div class="text-xs text-green-400">Good</div>
						</div>
					{/if}
					{#if fairCount > 0}
						<div class="text-center p-2 bg-yellow-900/30 rounded">
							<div class="text-2xl">🟡</div>
							<div class="text-sm text-yellow-300">{fairCount}</div>
							<div class="text-xs text-yellow-400">Fair</div>
						</div>
					{/if}
					{#if attentionCount > 0}
						<div class="text-center p-2 bg-orange-900/30 rounded">
							<div class="text-2xl">🟠</div>
							<div class="text-sm text-orange-300">{attentionCount}</div>
							<div class="text-xs text-orange-400">Attention</div>
						</div>
					{/if}
					{#if warningCount > 0}
						<div class="text-center p-2 bg-red-900/30 rounded">
							<div class="text-2xl">🔴</div>
							<div class="text-sm text-red-300">{warningCount}</div>
							<div class="text-xs text-red-400">Warning</div>
						</div>
					{/if}
					{#if criticalCount > 0}
						<div class="text-center p-2 bg-red-800/30 rounded">
							<div class="text-2xl">🔴</div>
							<div class="text-sm text-red-300">{criticalCount}</div>
							<div class="text-xs text-red-400">Critical</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if !loading && !error && deployments.length > 0}
			<!-- Deployment Metrics -->
			{#if deployments.filter(d => d._debug?.worker_created_on).length > 0}
				{@const metrics = deployments.filter(d => d._debug?.worker_created_on)}
				{@const totalDeployments = metrics.length}
				{@const recentDeployments = metrics.filter(d => isRecentDeployment(d._debug.worker_created_on)).length}
				{@const healthyDeployments = metrics.filter(d => {
					const health = getDeploymentHealth(d._debug.worker_created_on);
					return health.status === 'Excellent' || health.status === 'Good';
				}).length}
				{@const deploymentAges = metrics.map(d => (new Date() - new Date(d._debug.worker_created_on)) / (1000 * 60 * 60 * 24))}
				{@const avgAge = deploymentAges.reduce((a, b) => a + b, 0) / deploymentAges.length}
				{@const oldestAge = Math.max(...deploymentAges)}
				{@const newestAge = Math.min(...deploymentAges)}
				
				<div class="bg-gradient-to-r from-violet-900/20 to-purple-900/20 border border-violet-700 rounded-lg p-4 mb-6">
					<h3 class="text-violet-400 font-semibold mb-3">📊 Deployment Metrics</h3>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div class="text-center p-3 bg-violet-900/30 rounded">
							<div class="text-2xl text-violet-300">🎯</div>
							<div class="text-lg text-violet-200">{totalDeployments}</div>
							<div class="text-xs text-violet-400">Total</div>
						</div>
						<div class="text-center p-3 bg-violet-900/30 rounded">
							<div class="text-2xl text-violet-300">🚀</div>
							<div class="text-lg text-violet-200">{recentDeployments}</div>
							<div class="text-xs text-violet-400">Recent</div>
						</div>
						<div class="text-center p-3 bg-violet-900/30 rounded">
							<div class="text-2xl text-violet-300">✅</div>
							<div class="text-lg text-violet-200">{healthyDeployments}</div>
							<div class="text-xs text-violet-400">Healthy</div>
						</div>
						<div class="text-center p-3 bg-violet-900/30 rounded">
							<div class="text-2xl text-violet-300">⏱️</div>
							<div class="text-lg text-violet-200">{avgAge.toFixed(1)}</div>
							<div class="text-xs text-violet-400">Avg Days</div>
						</div>
					</div>
					<div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="text-center p-3 bg-violet-800/30 rounded">
							<div class="text-sm text-violet-300">Oldest Deployment</div>
							<div class="text-lg text-violet-200">{oldestAge.toFixed(1)} days</div>
						</div>
						<div class="text-center p-3 bg-violet-800/30 rounded">
							<div class="text-sm text-violet-300">Newest Deployment</div>
							<div class="text-lg text-violet-200">{newestAge.toFixed(1)} days</div>
						</div>
					</div>
				</div>
			{/if}
		{/if}

		{#if !loading && !error && deployments.length > 0}
			<!-- Deployment History -->
			{#if deployments.filter(d => d._debug?.worker_created_on).length > 1}
				{@const deploymentHistory = deployments
					.filter(d => d._debug?.worker_created_on)
					.sort((a, b) => new Date(b._debug.worker_created_on) - new Date(a._debug.worker_created_on))
					.slice(0, 5)
				}
				{#if deploymentHistory.length > 1}
				<div class="bg-purple-900/20 border border-purple-700 rounded-lg p-4 mb-6">
					<h3 class="text-purple-400 font-semibold mb-3">📚 Recent Deployment History</h3>
					<div class="space-y-2">
						{#each deploymentHistory as deployment, index}
							<div class="flex items-center justify-between p-2 bg-purple-900/30 rounded">
								<div class="flex items-center gap-3">
									<span class="text-purple-300 text-sm">#{index + 1}</span>
									<div>
										<div class="text-sm text-purple-200">{deployment.name}</div>
										<div class="text-xs text-purple-300">{deployment.version}</div>
									</div>
								</div>
								<div class="text-right">
									<div class="text-xs text-purple-300">
										{getDetailedTimeDifference(deployment._debug.worker_created_on)}
									</div>
									{#if deployment._debug?.worker_created_on}
										{@const ageCategory = getDeploymentAgeCategory(deployment._debug.worker_created_on)}
										<div class="text-xs {ageCategory.color}">
											{ageCategory.category}
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

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
			<!-- Deployment Summary -->
			<div class="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
				<h3 class="text-green-400 font-semibold mb-3">📊 Deployment Summary</h3>
				<div class="grid gap-3">
					{#each deployments.filter(d => d.environment === 'preview' || d.environment === 'production') as deployment}
						<div class="flex items-center justify-between p-3 bg-green-900/30 rounded">
							<div class="flex items-center gap-3">
								<span class="text-lg">
									{#if deployment.environment === 'preview'}🔍{:else}🚀{/if}
								</span>
								<div>
									<div class="flex items-center gap-2">
										<span class="font-semibold text-green-200">{deployment.name}</span>
										{#if deployment._debug?.worker_created_on && isRecentDeployment(deployment._debug.worker_created_on)}
											<span class="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded-full flex items-center gap-1">
												✨ FRESH
											</span>
										{/if}
										{@const health = getDeploymentHealth(deployment._debug?.worker_created_on)}
										<span class="text-xs {health.color} px-2 py-1 rounded-full flex items-center gap-1">
											{health.icon} {health.status}
										</span>
									</div>
									<div class="text-sm text-green-300">Version: {deployment.version}</div>
									{#if deployment._debug?.worker_created_on}
										{@const ageCategory = getDeploymentAgeCategory(deployment._debug.worker_created_on)}
										<div class="text-xs {ageCategory.color}">
											{ageCategory.category}
										</div>
									{/if}
								</div>
							</div>
							<div class="text-right">
								{#if deployment._debug?.worker_created_on}
									<div class="text-green-200 font-semibold">
										Last Deployed
									</div>
									<div class="text-sm text-green-300">
										{formatDate(deployment._debug.worker_created_on)}
									</div>
									<div class="text-xs text-green-400">
										{getDetailedTimeDifference(deployment._debug.worker_created_on)}
									</div>
									{#if getDeploymentFreshness(deployment._debug.worker_created_on) > 0}
										<div class="mt-2">
											<div class="text-xs text-green-400 mb-1">Freshness</div>
											<div class="w-16 bg-gray-700 rounded-full h-2">
												<div 
													class="bg-gradient-to-r from-green-400 to-yellow-400 h-2 rounded-full transition-all duration-300"
													style="width: {getDeploymentFreshness(deployment._debug.worker_created_on)}%"
												></div>
											</div>
										</div>
									{/if}
								{:else if deployment.deployedAt}
									<div class="text-green-200 font-semibold">
										Deployed
									</div>
									<div class="text-sm text-green-300">
										{deployment.deployedAt}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
			
			<!-- Debug Information -->
			<div class="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6" data-debug-section>
				<h3 class="text-blue-400 font-semibold mb-3">🔍 Debug Information</h3>
				<div class="text-xs text-blue-300 font-mono">
					<p class="mb-2">Raw deployment data (to help debug version display):</p>
					{#each deployments as deployment, index}
						<div class="mb-3 p-2 bg-blue-900/30 rounded">
							<div class="font-semibold text-blue-200">{deployment.name}:</div>
							<div class="text-blue-300">
								<div>Version: <span class="text-yellow-300">{deployment.version}</span></div>
								<div>Environment: <span class="text-yellow-300">{deployment.environment}</span></div>
								<div>Deployed At: <span class="text-yellow-300">{deployment.deployedAt}</span></div>
								{#if deployment._debug?.worker_created_on}
									<div class="text-green-300 font-semibold">
										🚀 Worker Last Deployed: <span class="text-yellow-300">{formatDate(deployment._debug.worker_created_on)}</span>
									</div>
									<div class="text-green-400 text-xs ml-4">
										⏰ {getDetailedTimeDifference(deployment._debug.worker_created_on)}
									</div>
								{/if}
								{#if deployment._debug?.deployment_created_on}
									<div class="text-green-300">
										📦 Deployment Created: <span class="text-yellow-300">{formatDate(deployment._debug.deployment_created_on)}</span>
									</div>
									<div class="text-green-400 text-xs ml-4">
										⏰ {getDetailedTimeDifference(deployment._debug.deployment_created_on)}
									</div>
								{/if}
								{#if deployment._debug}
									<div class="mt-2 text-blue-400">
										<div>Debug Metadata: <span class="text-yellow-300">{JSON.stringify(deployment._debug, null, 2)}</span></div>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
			
			<div class="grid gap-4">
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
									{#if deployment._debug?.worker_created_on && isRecentDeployment(deployment._debug.worker_created_on)}
										<span class="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded-full flex items-center gap-1">
											✨ FRESH
										</span>
									{/if}
									{@const health = getDeploymentHealth(deployment._debug?.worker_created_on)}
									<span class="text-xs {health.color} px-2 py-1 rounded-full flex items-center gap-1">
										{health.icon} {health.status}
									</span>
									{#if deployment._debug?.worker_created_on}
										{@const ageCategory = getDeploymentAgeCategory(deployment._debug.worker_created_on)}
										<span class="text-xs {ageCategory.color} px-2 py-1 rounded-full border border-current">
											{ageCategory.category}
										</span>
									{/if}
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
								
								{#if deployment._debug?.worker_created_on}
									<p class="text-blue-400 text-sm">
										🚀 Last Deployed: {formatDate(deployment._debug.worker_created_on)}
									</p>
									<p class="text-blue-500 text-xs">
										⏰ {getDetailedTimeDifference(deployment._debug.worker_created_on)}
									</p>
									{@const ageCategory = getDeploymentAgeCategory(deployment._debug.worker_created_on)}
									<p class="text-xs {ageCategory.color}">
										📊 {ageCategory.category}
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
		
		{#if !loading && !error && deployments.length > 0}
			<!-- Deployment Summary Cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
				{#each deployments.filter(d => d.environment === 'preview' || d.environment === 'production') as deployment}
					<div class="bg-gradient-to-br from-gray-800/20 to-gray-700/20 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-colors">
						<div class="flex items-center gap-3 mb-3">
							<span class="text-2xl">
								{#if deployment.environment === 'preview'}🔍{:else}🚀{/if}
							</span>
							<div>
								<h4 class="font-semibold text-gray-200">{deployment.name}</h4>
								<div class="text-xs text-gray-400">{deployment.environment}</div>
							</div>
						</div>
						
						<div class="space-y-2 mb-3">
							<div class="flex justify-between text-sm">
								<span class="text-gray-400">Version:</span>
								<span class="text-gray-200 font-mono">{deployment.version}</span>
							</div>
							{#if deployment._debug?.worker_created_on}
								<div class="flex justify-between text-sm">
									<span class="text-gray-400">Deployed:</span>
									<span class="text-gray-200">{getDetailedTimeDifference(deployment._debug.worker_created_on)}</span>
								</div>
							{/if}
						</div>
						
						<div class="flex flex-wrap gap-2">
							{#if deployment._debug?.worker_created_on}
								{@const health = getDeploymentHealth(deployment._debug.worker_created_on)}
								<span class="text-xs {health.color} px-2 py-1 rounded-full">
									{health.icon} {health.status}
								</span>
								{@const ageCategory = getDeploymentAgeCategory(deployment._debug.worker_created_on)}
								<span class="text-xs {ageCategory.color} px-2 py-1 rounded-full border border-current">
									{ageCategory.category}
								</span>
								{#if isRecentDeployment(deployment._debug.worker_created_on)}
									<span class="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded-full">
										✨ FRESH
									</span>
								{/if}
							{/if}
						</div>
						
						{#if deployment.url}
							<div class="mt-3">
								<a
									href={deployment.url}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors w-full justify-center"
								>
									🔗 Visit Site
								</a>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		{#if !loading && !error && deployments.length > 0}
			<!-- Deployment Recommendations -->
			{#if deployments.filter(d => d._debug?.worker_created_on).length > 0}
				{@const recommendations = []}
				{@const oldestDeployment = deployments
					.filter(d => d._debug?.worker_created_on)
					.sort((a, b) => new Date(a._debug.worker_created_on) - new Date(b._debug.worker_created_on))[0]
				}
				{#if oldestDeployment}
					{@const oldestAge = (new Date() - new Date(oldestDeployment._debug.worker_created_on)) / (1000 * 60 * 60 * 24)}
					{#if oldestAge > 30}
						{@const _ = recommendations.push('Consider updating older deployments to ensure security and performance')}
					{/if}
					{#if oldestAge > 7}
						{@const _ = recommendations.push('Some deployments are over a week old - consider refreshing them')}
					{/if}
				{/if}
				{#if deployments.filter(d => d._debug?.worker_created_on && isRecentDeployment(d._debug.worker_created_on)).length === 0}
					{@const _ = recommendations.push('No recent deployments detected - consider deploying updates')}
				{/if}
				
				{#if recommendations.length > 0}
				<div class="bg-amber-900/20 border border-amber-700 rounded-lg p-4 mb-6">
					<h3 class="text-amber-400 font-semibold mb-3">💡 Deployment Recommendations</h3>
					<div class="space-y-2">
						{#each recommendations as recommendation}
							<div class="flex items-start gap-2">
								<span class="text-amber-400">💡</span>
								<p class="text-sm text-amber-300">{recommendation}</p>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		{#if !loading && !error && deployments.length > 0}
			<!-- Deployment Trends -->
			{#if deployments.filter(d => d._debug?.worker_created_on).length > 1}
				{@const deploymentTrends = deployments
					.filter(d => d._debug?.worker_created_on)
					.sort((a, b) => new Date(a._debug.worker_created_on) - new Date(b._debug.worker_created_on))
				}
				{#if deploymentTrends.length > 1}
				{@const firstDeployment = new Date(deploymentTrends[0]._debug.worker_created_on)}
				{@const lastDeployment = new Date(deploymentTrends[deploymentTrends.length - 1]._debug.worker_created_on)}
				{@const totalTimeMs = lastDeployment - firstDeployment}
				{@const totalDays = totalTimeMs / (1000 * 60 * 60 * 24)}
				{@const avgDeploymentInterval = totalDays / (deploymentTrends.length - 1)}
				
				<div class="bg-indigo-900/20 border border-indigo-700 rounded-lg p-4 mb-6">
					<h3 class="text-indigo-400 font-semibold mb-3">📊 Deployment Trends</h3>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="text-center p-3 bg-indigo-900/30 rounded">
							<div class="text-2xl text-indigo-300">📅</div>
							<div class="text-lg text-indigo-200">{deploymentTrends.length}</div>
							<div class="text-xs text-indigo-400">Total Deployments</div>
						</div>
						<div class="text-center p-3 bg-indigo-900/30 rounded">
							<div class="text-2xl text-indigo-300">⏱️</div>
							<div class="text-lg text-indigo-200">{Math.round(totalDays)}</div>
							<div class="text-xs text-indigo-400">Days Span</div>
						</div>
						<div class="text-center p-3 bg-indigo-900/30 rounded">
							<div class="text-2xl text-indigo-300">🔄</div>
							<div class="text-lg text-indigo-200">{avgDeploymentInterval > 1 ? Math.round(avgDeploymentInterval) : avgDeploymentInterval.toFixed(1)}</div>
							<div class="text-xs text-indigo-400">Avg Days Between</div>
						</div>
					</div>
				</div>
			{/if}
		{/if}

		{#if !loading && !error && deployments.length > 0}
			<!-- Deployment Progress Timeline -->
			{#if deployments.filter(d => d._debug?.worker_created_on).length > 1}
				{@const timelineDeployments = deployments
					.filter(d => d._debug?.worker_created_on)
					.sort((a, b) => new Date(a._debug.worker_created_on) - new Date(b._debug.worker_created_on))
				}
				{#if timelineDeployments.length > 1}
				<div class="bg-gradient-to-r from-rose-900/20 to-pink-900/20 border border-rose-700 rounded-lg p-4 mb-6">
					<h3 class="text-rose-400 font-semibold mb-3">⏳ Deployment Timeline</h3>
					<div class="relative">
						<!-- Timeline line -->
						<div class="absolute left-4 top-0 bottom-0 w-0.5 bg-rose-600/50"></div>
						
						<div class="space-y-4">
							{#each timelineDeployments as deployment, index}
								<div class="relative flex items-start gap-4">
									<!-- Timeline dot -->
									<div class="relative z-10 flex-shrink-0 w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center">
										<span class="text-white text-xs font-bold">{index + 1}</span>
									</div>
									
									<div class="flex-1 pt-1">
										<div class="flex items-center gap-2 mb-1">
											<h4 class="font-semibold text-rose-200">{deployment.name}</h4>
											<span class="text-xs text-rose-300">v{deployment.version}</span>
										</div>
										<div class="text-sm text-rose-300 mb-2">
											{formatDate(deployment._debug.worker_created_on)}
										</div>
										<div class="flex items-center gap-2">
											{@const health = getDeploymentHealth(deployment._debug.worker_created_on)}
											<span class="text-xs {health.color} px-2 py-1 rounded-full">
												{health.icon} {health.status}
											</span>
											{@const ageCategory = getDeploymentAgeCategory(deployment._debug.worker_created_on)}
											<span class="text-xs {ageCategory.color} px-2 py-1 rounded-full border border-current">
												{ageCategory.category}
											</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		{/if}

		{#if !loading && !error && deployments.length > 0}
			<!-- Deployment Alerts -->
			{#if deployments.filter(d => d._debug?.worker_created_on).length > 0}
				{@const alerts = []}
				{#each deployments as deployment}
					{#if deployment._debug?.worker_created_on}
						{@const deploymentAge = (new Date() - new Date(deployment._debug.worker_created_on)) / (1000 * 60 * 60 * 24)}
						{#if deploymentAge > 30}
							{@const _ = alerts.push({
								type: 'warning',
								title: `${deployment.name} is very old`,
								message: `Last deployed ${Math.round(deploymentAge)} days ago`,
								deployment: deployment
							})}
						{:else if deploymentAge > 7}
							{@const _ = alerts.push({
								type: 'info',
								title: `${deployment.name} needs attention`,
								message: `Last deployed ${Math.round(deploymentAge)} days ago`,
								deployment: deployment
							})}
						{/if}
					{/if}
				{/each}
				
				{#if alerts.length > 0}
				<div class="space-y-3 mb-6">
					{#each alerts as alert}
						<div class="border rounded-lg p-4 {alert.type === 'warning' ? 'bg-red-900/20 border-red-700' : 'bg-blue-900/20 border-blue-700'}">
							<div class="flex items-start gap-3">
								<span class="text-lg">
									{#if alert.type === 'warning'}⚠️{:else}ℹ️{/if}
								</span>
								<div class="flex-1">
									<h4 class="font-semibold {alert.type === 'warning' ? 'text-red-300' : 'text-blue-300'} mb-1">
										{alert.title}
									</h4>
									<p class="text-sm {alert.type === 'warning' ? 'text-red-400' : 'text-blue-400'} mb-2">
										{alert.message}
									</p>
									<div class="text-xs text-gray-400">
										Environment: {alert.deployment.environment} | Version: {alert.deployment.version}
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		{#if !loading && !error && deployments.length > 0}
			<!-- Environment Comparison -->
			{#if deployments.filter(d => d.environment === 'preview' || d.environment === 'production').length > 1}
				{@const environmentComparison = deployments
					.filter(d => d.environment === 'preview' || d.environment === 'production')
					.sort((a, b) => a.environment === 'preview' ? -1 : 1)
				}
				{#if environmentComparison.length > 1}
					<div class="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-700 rounded-lg p-4 mb-6">
						<h3 class="text-purple-400 font-semibold mb-3">⚖️ Environment Comparison</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each environmentComparison as deployment}
								<div class="p-3 bg-purple-900/30 rounded">
									<div class="flex items-center gap-2 mb-2">
										<span class="text-lg">
											{#if deployment.environment === 'preview'}🔍{:else}🚀{/if}
										</span>
										<h4 class="font-semibold text-purple-200">{deployment.name}</h4>
									</div>
									<div class="space-y-1 text-sm">
										<div class="flex justify-between">
											<span class="text-purple-300">Version:</span>
											<span class="text-purple-100">{deployment.version}</span>
										</div>
										{#if deployment._debug?.worker_created_on}
											<div class="flex justify-between">
												<span class="text-purple-300">Last Deployed:</span>
												<span class="text-purple-100">{getDetailedTimeDifference(deployment._debug.worker_created_on)}</span>
											</div>
											{@const ageCategory = getDeploymentAgeCategory(deployment._debug.worker_created_on)}
											<div class="flex justify-between">
												<span class="text-purple-300">Age Category:</span>
												<span class="text-xs {ageCategory.color}">{ageCategory.category}</span>
											</div>
											{@const health = getDeploymentHealth(deployment._debug.worker_created_on)}
											<div class="flex justify-between">
												<span class="text-purple-300">Health:</span>
												<span class="text-xs {health.color}">{health.icon} {health.status}</span>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
		{/if}

		{#if !loading && !error && deployments.length > 0}
			<!-- Deployment Insights -->
			{#if deployments.filter(d => d._debug?.worker_created_on).length > 0}
				{@const insights = []}
				{@const allDeployments = deployments.filter(d => d._debug?.worker_created_on)}
				{@const recentDeployments = allDeployments.filter(d => isRecentDeployment(d._debug.worker_created_on))}
				{@const healthyDeployments = allDeployments.filter(d => {
					const health = getDeploymentHealth(d._debug.worker_created_on);
					return health.status === 'Excellent' || health.status === 'Good';
				})}
				
				{#if recentDeployments.length > 0}
					{@const _ = insights.push({
						type: 'positive',
						icon: '🎉',
						title: 'Active Development',
						message: `${recentDeployments.length} deployment${recentDeployments.length > 1 ? 's' : ''} in the last hour`
					})}
				{/if}
				
				{#if healthyDeployments.length === allDeployments.length && allDeployments.length > 0}
					{@const _ = insights.push({
						type: 'positive',
						icon: '✅',
						title: 'Excellent Health',
						message: 'All deployments are in excellent or good health'
					})}
				{:else if healthyDeployments.length > 0}
					{@const _ = insights.push({
						type: 'info',
						icon: '📊',
						title: 'Mixed Health',
						message: `${healthyDeployments.length} of ${allDeployments.length} deployments are healthy`
					})}
				{/if}
				
				{#if allDeployments.length > 1}
					{@const deploymentAges = allDeployments.map(d => (new Date() - new Date(d._debug.worker_created_on)) / (1000 * 60 * 60 * 24))}
					{@const avgAge = deploymentAges.reduce((a, b) => a + b, 0) / deploymentAges.length}
					{#if avgAge < 1}
						{@const _ = insights.push({
							type: 'positive',
							icon: '🚀',
							title: 'Frequent Deployments',
							message: 'Average deployment age is less than 1 day'
						})}
					{:else if avgAge < 7}
						{@const _ = insights.push({
							type: 'info',
							icon: '📅',
							title: 'Regular Deployments',
							message: `Average deployment age is ${Math.round(avgAge)} days`
						})}
					{:else}
						{@const _ = insights.push({
							type: 'warning',
							icon: '⏰',
							title: 'Infrequent Deployments',
							message: `Average deployment age is ${Math.round(avgAge)} days - consider more frequent updates`
						})}
					{/if}
				{/if}
				
				{#if insights.length > 0}
					<div class="bg-gradient-to-r from-teal-900/20 to-cyan-900/20 border border-teal-700 rounded-lg p-4 mb-6">
						<h3 class="text-teal-400 font-semibold mb-3">🧠 Deployment Insights</h3>
						<div class="space-y-3">
							{#each insights as insight}
								<div class="flex items-start gap-3 p-3 bg-teal-900/30 rounded">
									<span class="text-2xl">{insight.icon}</span>
									<div class="flex-1">
										<h4 class="font-semibold text-teal-200 mb-1">{insight.title}</h4>
										<p class="text-sm text-teal-300">{insight.message}</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		{/if}

		{#if !loading && !error && deployments.length > 0}
			<!-- Deployment Actions -->
			<div class="bg-gradient-to-r from-emerald-900/20 to-green-900/20 border border-emerald-700 rounded-lg p-4 mb-6">
				<h3 class="text-emerald-400 font-semibold mb-3">⚡ Quick Actions</h3>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
					<button 
						onclick={manualRefresh}
						disabled={refreshing}
						class="flex items-center gap-2 p-3 bg-emerald-900/30 hover:bg-emerald-900/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-left"
					>
						<span class="text-2xl">
							{#if refreshing}⏳{:else}🔄{/if}
						</span>
						<div>
							<div class="font-semibold text-emerald-200">
								{#if refreshing}Refreshing...{:else}Refresh Data{/if}
							</div>
							<div class="text-xs text-emerald-400">
								{#if refreshing}Updating...{:else}Update deployment information{/if}
							</div>
						</div>
					</button>
					
					<button 
						onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
						class="flex items-center gap-2 p-3 bg-emerald-900/30 hover:bg-emerald-900/50 rounded-lg transition-colors text-left"
					>
						<span class="text-2xl">📊</span>
						<div>
							<div class="font-semibold text-emerald-200">View Summary</div>
							<div class="text-xs text-emerald-400">Go to deployment summary</div>
						</div>
					</button>
					
					<button 
						onclick={() => {
							const debugSection = document.querySelector('[data-debug-section]');
							if (debugSection) {
								debugSection.scrollIntoView({ behavior: 'smooth' });
							}
						}}
						class="flex items-center gap-2 p-3 bg-emerald-900/30 hover:bg-emerald-900/50 rounded-lg transition-colors text-left"
					>
						<span class="text-2xl">🔍</span>
						<div>
							<div class="font-semibold text-emerald-200">Debug Info</div>
							<div class="text-xs text-emerald-400">View detailed debug data</div>
						</div>
					</button>
				</div>
			</div>
		{/if}

		{#if !loading && !error && deployments.length > 0}
			<!-- Deployment Notifications -->
			{#if deployments.filter(d => d._debug?.worker_created_on).length > 0}
				{@const notifications = []}
				{#each deployments as deployment}
					{#if deployment._debug?.worker_created_on}
						{@const deploymentAge = (new Date() - new Date(deployment._debug.worker_created_on)) / (1000 * 60 * 60 * 24)}
						{#if deploymentAge < 0.1} <!-- Less than 2.4 hours -->
							{@const _ = notifications.push({
								type: 'success',
								icon: '🎉',
								title: 'Very Recent Deployment',
								message: `${deployment.name} was deployed very recently`,
								deployment: deployment
							})}
						{:else if deploymentAge < 1} <!-- Less than 1 day -->
							{@const _ = notifications.push({
								type: 'info',
								icon: '📅',
								title: 'Recent Deployment',
								message: `${deployment.name} was deployed today`,
								deployment: deployment
							})}
						{/if}
					{/if}
				{/each}
				
				{#if notifications.length > 0}
					<div class="space-y-3 mb-6">
						{#each notifications as notification}
							<div class="border rounded-lg p-4 {notification.type === 'success' ? 'bg-green-900/20 border-green-700' : 'bg-blue-900/20 border-blue-700'}">
								<div class="flex items-start gap-3">
									<span class="text-lg">{notification.icon}</span>
									<div class="flex-1">
										<h4 class="font-semibold {notification.type === 'success' ? 'text-green-300' : 'text-blue-300'} mb-1">
											{notification.title}
										</h4>
										<p class="text-sm {notification.type === 'success' ? 'text-green-400' : 'text-blue-400'} mb-2">
											{notification.message}
										</p>
										<div class="text-xs text-gray-400">
											Environment: {notification.deployment.environment} | Version: {notification.deployment.version}
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		{/if}

{#if !loading && !error && deployments.length > 0}
	<!-- Footer Status Summary -->
	<div class="bg-gray-900/50 border-t border-gray-700 py-4">
		<div class="container mx-auto px-4">
			<div class="flex flex-col md:flex-row items-center justify-between gap-4">
				<div class="flex items-center gap-4 text-sm text-gray-400">
					<span>📊 {deployments.length} deployment{deployments.length > 1 ? 's' : ''}</span>
					{#if lastUpdated}
						<span>🔄 Updated {getDetailedTimeDifference(lastUpdated)}</span>
					{/if}
				</div>
				
				<div class="flex items-center gap-4 text-sm">
					{#if deployments.some(d => d._debug?.worker_created_on && isRecentDeployment(d._debug.worker_created_on))}
						<span class="text-yellow-400">🚀 Recent deployments detected</span>
					{/if}
					{#if deployments.some(d => d._debug?.worker_created_on && (new Date() - new Date(d._debug.worker_created_on)) / (1000 * 60 * 60 * 24) > 7)}
						<span class="text-orange-400">⚠️ Some deployments are over a week old</span>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<Footer />