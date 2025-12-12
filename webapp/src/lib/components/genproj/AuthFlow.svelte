<!--
  @fileoverview AuthFlow component for progressive authentication
  @description Handles progressive authentication for required services
-->

<script>
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
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
		google: false
	});

	let error = $state(null);

	// Get required auth services for selected capabilities
	let requiredAuthServices = $derived.by(() => {
		const required = new SvelteSet();
		for (const capabilityId of selectedCapabilities) {
			const capability = capabilities.find((c) => c.id === capabilityId);
			if (capability?.requiresAuth) {
				for (const service of capability.requiresAuth) {
					required.add(service);
				}
			}
		}
		// GitHub is always required for project generation, but its auth flow is initiated directly from +page.svelte
		// This modal only handles GitHub auth if other capabilities explicitly require it AND the user is not authenticated.
		// For the purpose of determining if project generation needs GitHub, it is always a required service.
		// However, for this modal, we primarily care about other services that need auth.
		return [...required];
	});

	let servicesToDisplayInModal = $derived.by(() => {
		// Only display services that are NOT GitHub, OR if GitHub is required AND not authenticated
		// AND there are other services to authenticate.
		const services = requiredAuthServices.filter((service) => service !== 'github');
		if (requiredAuthServices.includes('github') && !authStatus.github && services.length === 0) {
			// If GitHub is the only service required by the modal and not authenticated,
			// the modal should not show up. The main page should handle this.
			return [];
		}
		return services;
	});

	// Check if all required auth is complete
	let allAuthComplete = $derived.by(() => {
		return requiredAuthServices.every((service) => authStatus[service] === true);
	});

	// Service display names
	const serviceNames = {
		google: 'Google'
	};

	// Service descriptions
	const serviceDescriptions = {};

	// Load authentication status
	async function loadAuthStatus() {
		if (!isAuthenticated) {
			return;
		}

		try {
			authStatus.google = true;
		} catch (error_) {
			logger.error('Failed to load auth status', { error: error_.message });
			error = error_.message;
		}
	}

	// Check URL for auth completion
	function checkAuthCallback() {
		// Skip if window.location is not available (test environment)
		if (globalThis.window === undefined || !globalThis.location || !globalThis.location.href) {
			return;
		}

		const url = new URL(globalThis.location.href);
		const authParameter = url.searchParams.get('auth');
		const errorParameter = url.searchParams.get('error');

		if (errorParameter) {
			error = `Authentication failed: ${errorParameter}`;
			// Clear error param from URL
			if (globalThis.window !== undefined && globalThis.location && globalThis.history) {
				const newUrl = new URL(globalThis.location.href);
				newUrl.searchParams.delete('error');
				globalThis.history.replaceState({}, '', newUrl.toString());
			}
		} else if (authParameter) {
			// Parse which service completed
			const service = authParameter.replace('_success', '');
			if (service && Object.prototype.hasOwnProperty.call(authStatus, service)) {
				authStatus[service] = true;
				// Clear auth param from URL
				if (globalThis.window !== undefined && globalThis.location && globalThis.history) {
					const newUrl = new URL(globalThis.location.href);
					newUrl.searchParams.delete('auth');
					globalThis.history.replaceState({}, '', newUrl.toString());
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

{#if show && servicesToDisplayInModal.length > 0}
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
					{#each servicesToDisplayInModal as service (service)}
						{@const isAuthenticated = authStatus[service]}
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
						</div>
					{/each}
				</div>

				<!-- Footer -->
				<div class="mt-6 flex items-center justify-end gap-3">
					{#if allAuthComplete}
						<p class="text-sm text-green-400">All authentication complete!</p>
					{:else}
						<p class="text-sm text-gray-400">
							{servicesToDisplayInModal.filter((s) => !authStatus[s]).length} service(s) remaining
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
