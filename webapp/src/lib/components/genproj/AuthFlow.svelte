<!--
  @fileoverview AuthFlow component for progressive authentication
  @description Handles progressive authentication for required services
-->

<script>
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logging.js';
	import { capabilities } from '$lib/config/capabilities.js';

	// Props
	let {
		isAuthenticated = false,
		selectedCapabilities = [],
		onAuthComplete = () => {},
		show = false
	} = $props();

	// State
	let authStatus = $state({
		google: false,
		github: false,
		circleci: false,
		doppler: false,
		sonarcloud: false
	});

	let loading = $state(false);
	let error = $state(null);
	let authenticatingService = $state(null);
	let tokenInputs = $state({});

	// Get required auth services for selected capabilities
	let requiredAuthServices = $derived.by(() => {
		const required = new Set(['github']); // GitHub is always required for project generation
		for (const capabilityId of selectedCapabilities) {
			const capability = capabilities.find((c) => c.id === capabilityId);
			if (capability?.requiresAuth) {
				for (const service of capability.requiresAuth) {
					required.add(service);
				}
			}
		}
		return Array.from(required);
	});

	// Check if all required auth is complete
	let allAuthComplete = $derived.by(() => {
		return requiredAuthServices.every((service) => authStatus[service] === true);
	});

	// Service display names
	const serviceNames = {
		google: 'Google',
		github: 'GitHub',
		circleci: 'CircleCI',
		doppler: 'Doppler',
		sonarcloud: 'SonarCloud'
	};

	// Service descriptions
	const serviceDescriptions = {
		github: 'Required for creating GitHub repositories',
		circleci: 'Required for setting up CI/CD pipelines',
		doppler: 'Required for secrets management',
		sonarcloud: 'Required for code quality analysis'
	};

	// Load authentication status
	async function loadAuthStatus() {
		if (!isAuthenticated) {
			return;
		}

		try {
			loading = true;
			// TODO: Fetch auth status from API endpoint
			// For now, we'll assume user needs to authenticate
			authStatus = {
				google: isAuthenticated,
				github: false,
				circleci: false,
				doppler: false,
				sonarcloud: false
			};
		} catch (err) {
			logger.error('Failed to load auth status', { error: err.message });
			error = err.message;
		} finally {
			loading = false;
		}
	}

	// Handle GitHub OAuth
	async function handleGitHubAuth() {
		try {
			authenticatingService = 'github';
			loading = true;
			error = null;

			// Build GitHub auth URL with current state to preserve selections
			// We need to pass the selections through the OAuth flow so they're preserved on redirect
			let authUrl = '/projects/genproj/api/auth/github';
			
			// Get current selections from parent (if available via URL)
			if (typeof window !== 'undefined' && window.location) {
				const url = new URL(window.location.href);
				const selectedParam = url.searchParams.get('selected');
				const projectNameParam = url.searchParams.get('projectName');
				const repositoryUrlParam = url.searchParams.get('repositoryUrl');
				
				const params = new URLSearchParams();
				if (selectedParam) params.set('selected', selectedParam);
				if (projectNameParam) params.set('projectName', projectNameParam);
				if (repositoryUrlParam) params.set('repositoryUrl', repositoryUrlParam);
				
				const queryString = params.toString();
				if (queryString) {
					authUrl += `?${queryString}`;
				}
			}

			// Redirect to GitHub OAuth
			if (typeof window !== 'undefined' && window.location) {
				window.location.href = authUrl;
			}
		} catch (err) {
			logger.error('GitHub auth failed', { error: err.message });
			error = err.message;
			loading = false;
			authenticatingService = null;
		}
	}

	// Handle external service token authentication
	async function handleTokenAuth(service) {
		const token = tokenInputs[service]?.trim();

		if (!token) {
			error = `${serviceNames[service]} token is required`;
			return;
		}

		try {
			authenticatingService = service;
			loading = true;
			error = null;

			const response = await fetch(`/projects/genproj/api/auth/${service}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ token })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || `${serviceNames[service]} authentication failed`);
			}

			const result = await response.json();

			// Update auth status
			authStatus[service] = true;
			tokenInputs[service] = ''; // Clear token input

			logger.info(`${serviceNames[service]} authentication successful`);

			// Check if all auth is complete
			if (allAuthComplete) {
				setTimeout(() => {
					onAuthComplete();
				}, 500); // Small delay to show success
			}
		} catch (err) {
			logger.error(`${serviceNames[service]} auth failed`, { error: err.message });
			error = err.message;
		} finally {
			loading = false;
			authenticatingService = null;
		}
	}

	// Get auth URL for external service (opens token creation page)
	function getAuthUrl(service) {
		return `/projects/genproj/api/auth/${service}`;
	}

	// Open auth URL in new tab
	function openAuthUrl(service) {
		if (typeof window !== 'undefined' && window.open) {
			window.open(getAuthUrl(service), '_blank');
		}
	}

	// Check URL for auth completion
	function checkAuthCallback() {
		// Skip if window.location is not available (test environment)
		if (typeof window === 'undefined' || !window.location || !window.location.href) {
			return;
		}

		const url = new URL(window.location.href);
		const authParam = url.searchParams.get('auth');
		const errorParam = url.searchParams.get('error');

		if (errorParam) {
			error = `Authentication failed: ${errorParam}`;
			// Clear error param from URL
			if (typeof window !== 'undefined' && window.location && window.history) {
				const newUrl = new URL(window.location.href);
				newUrl.searchParams.delete('error');
				window.history.replaceState({}, '', newUrl.toString());
			}
		} else if (authParam) {
			// Parse which service completed
			const service = authParam.replace('_success', '');
			if (service && authStatus.hasOwnProperty(service)) {
				authStatus[service] = true;
				// Clear auth param from URL
				if (typeof window !== 'undefined' && window.location && window.history) {
					const newUrl = new URL(window.location.href);
					newUrl.searchParams.delete('auth');
					window.history.replaceState({}, '', newUrl.toString());
				}

				logger.info(`${serviceNames[service]} authentication successful`);

				// Check if all auth is complete
				if (allAuthComplete) {
					onAuthComplete();
				}
			}
		}
	}

	// Load auth status on mount
	onMount(() => {
		loadAuthStatus();
		checkAuthCallback();
	});

	// Watch for URL changes (OAuth callback)
	onMount(() => {
		const checkInterval = setInterval(() => {
			checkAuthCallback();
		}, 1000);

		return () => clearInterval(checkInterval);
	});
</script>

{#if show && requiredAuthServices.length > 0}
	<div
		class="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50"
		role="dialog"
		aria-labelledby="auth-flow-title"
		aria-modal="true"
	>
		<div
			class="relative top-20 mx-auto p-5 border border-gray-700 w-full max-w-2xl shadow-lg rounded-md bg-gray-800"
		>
			<div class="mt-3">
				<!-- Header -->
				<div class="flex items-center justify-between mb-4">
					<h3 id="auth-flow-title" class="text-lg font-medium text-white">
						Authentication Required
					</h3>
					<button
						class="text-gray-400 hover:text-white"
						onclick={() => onAuthComplete()}
						aria-label="Close"
					>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<!-- Error Message -->
				{#if error}
					<div class="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-md">
						<p class="text-sm text-red-200">{error}</p>
					</div>
				{/if}

				<!-- Auth Status List -->
				<div class="space-y-4">
					{#each requiredAuthServices as service}
						{@const isAuthenticated = authStatus[service]}
						{@const isAuthenticating = authenticatingService === service}
						<div
							class="p-4 border rounded-md {isAuthenticated
								? 'border-green-700 bg-green-900 bg-opacity-20'
								: 'border-gray-700 bg-gray-900'}"
						>
							<div class="flex items-center justify-between mb-2">
								<div class="flex items-center gap-3">
									{#if isAuthenticated}
										<svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
												clip-rule="evenodd"
											/>
										</svg>
									{:else}
										<svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
												clip-rule="evenodd"
											/>
										</svg>
									{/if}
									<div>
										<h4 class="text-sm font-medium text-white">{serviceNames[service]}</h4>
										{#if serviceDescriptions[service]}
											<p class="text-xs text-gray-400">{serviceDescriptions[service]}</p>
										{/if}
									</div>
								</div>
							</div>

							{#if !isAuthenticated}
								{#if service === 'github'}
									<!-- GitHub OAuth Button -->
									<button
										class="mt-2 w-full px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
										onclick={handleGitHubAuth}
										disabled={loading || isAuthenticating}
									>
										{loading && isAuthenticating
											? 'Authenticating...'
											: `Authenticate with ${serviceNames[service]}`}
									</button>
								{:else}
									<!-- Token Input for External Services -->
									<div class="mt-2 space-y-2">
										<div class="flex gap-2">
											<input
												type="password"
												placeholder={`Enter ${serviceNames[service]} token`}
												bind:value={tokenInputs[service]}
												class="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
												disabled={loading || isAuthenticating}
											/>
											<button
												class="px-3 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 border border-gray-600"
												onclick={() => openAuthUrl(service)}
												title="Open token creation page"
											>
												?
											</button>
										</div>
										<button
											class="w-full px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
											onclick={() => handleTokenAuth(service)}
											disabled={loading || isAuthenticating || !tokenInputs[service]?.trim()}
										>
											{loading && isAuthenticating
												? 'Validating...'
												: `Authenticate with ${serviceNames[service]}`}
										</button>
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>

				<!-- Footer -->
				<div class="mt-6 flex items-center justify-end gap-3">
					{#if allAuthComplete}
						<p class="text-sm text-green-400">All authentication complete!</p>
					{:else}
						<p class="text-sm text-gray-400">
							{requiredAuthServices.filter((s) => !authStatus[s]).length} service(s) remaining
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
