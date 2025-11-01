<!--
  @fileoverview Main genproj page component
  @description Two-tab interface for capability selection and preview
-->

<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import CapabilitySelector from '$lib/components/genproj/CapabilitySelector.svelte';
	import PreviewMode from '$lib/components/genproj/PreviewMode.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { logger } from '$lib/utils/logging.js';
	import { initiateGoogleAuth } from '$lib/client/google-auth.js';

	let { data = { isAuthenticated: false } } = $props();

	// Reactive state
	let activeTab = $state('capabilities');
	let capabilities = $state(data.capabilities || []);
	let selectedCapabilities = $state(data.selectedCapabilities || []);
	let projectName = $state('');
	let repositoryUrl = $state('');
	let configuration = $state({});
	let loading = $state(!data.capabilities || data.capabilities.length === 0);
	let error = $state(null);

	// Tab management
	function switchTab(tab) {
		activeTab = tab;
	}

	// Map devcontainer capabilities to SonarCloud languages
	function getSonarCloudLanguageForDevcontainer(devcontainerId) {
		const mapping = {
			'devcontainer-node': 'javascript',
			'devcontainer-python': 'python',
			'devcontainer-java': 'java'
		};
		return mapping[devcontainerId];
	}

	function isDependencyStillRequired(dependencyId) {
		return capabilities.some((capability) => {
			if (!capability.dependencies?.includes(dependencyId)) {
				return false;
			}
			return selectedCapabilities.includes(capability.id);
		});
	}

	function removeCapabilityAndDependents(capabilityId) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (!capability) {
			return;
		}

		const sonarCloudLanguage = getSonarCloudLanguageForDevcontainer(capabilityId);
		if (sonarCloudLanguage) {
			const sonarCloudConfig = configuration['sonarcloud'];
			if (sonarCloudConfig?.languages) {
				const updatedLanguages = sonarCloudConfig.languages.filter(
					(lang) => lang !== sonarCloudLanguage
				);
				if (updatedLanguages.length > 0) {
					configuration['sonarcloud'] = { ...sonarCloudConfig, languages: updatedLanguages };
				} else {
					delete configuration['sonarcloud'];
				}
			}
		}

		selectedCapabilities = selectedCapabilities.filter((id) => id !== capabilityId);
		if (configuration[capabilityId]) {
			const { [capabilityId]: _, ...remainingConfig } = configuration;
			configuration = remainingConfig;
		}
		configuration = { ...configuration };

		for (const dependencyId of capability.dependencies || []) {
			if (selectedCapabilities.includes(dependencyId) && !isDependencyStillRequired(dependencyId)) {
				removeCapabilityAndDependents(dependencyId);
			}
		}
	}

	// Capability selection handlers
	function handleCapabilityToggle(event) {
		const { capabilityId, selected } = event.detail;
		const capability = capabilities.find((c) => c.id === capabilityId);

		if (!capability) {
			return;
		}
		if (selected) {
			// Add the selected capability
			selectedCapabilities = [...selectedCapabilities, capabilityId];

			// Auto-select any missing dependencies
			if (capability && capability.dependencies) {
				for (const depId of capability.dependencies) {
					if (!selectedCapabilities.includes(depId)) {
						selectedCapabilities = [...selectedCapabilities, depId];
					}
				}
			}

			// Auto-select SonarCloud language if devcontainer capability is selected
			// Update configuration even if SonarCloud isn't selected yet
			const sonarCloudLanguage = getSonarCloudLanguageForDevcontainer(capabilityId);
			if (sonarCloudLanguage) {
				const sonarCloudConfig = configuration['sonarcloud'] || { languages: ['javascript'] };
				const currentLanguages = sonarCloudConfig.languages || [];
				if (!currentLanguages.includes(sonarCloudLanguage)) {
					configuration['sonarcloud'] = {
						...sonarCloudConfig,
						languages: [...currentLanguages, sonarCloudLanguage]
					};
				}
			}

			// If SonarCloud is being selected, auto-select languages for any already-selected devcontainer capabilities
			if (capabilityId === 'sonarcloud') {
				const sonarCloudConfig = configuration['sonarcloud'] || { languages: ['javascript'] };
				const currentLanguages = sonarCloudConfig.languages || [];
				const devcontainerLanguages = [];

				// Check all devcontainer capabilities that are already selected
				for (const selectedId of selectedCapabilities) {
					const lang = getSonarCloudLanguageForDevcontainer(selectedId);
					if (lang && !devcontainerLanguages.includes(lang)) {
						devcontainerLanguages.push(lang);
					}
				}

				// Merge devcontainer languages with existing languages, avoiding duplicates
				const allLanguages = [...new Set([...currentLanguages, ...devcontainerLanguages])];
				if (allLanguages.length > 0) {
					configuration['sonarcloud'] = {
						...sonarCloudConfig,
						languages: allLanguages
					};
				}
			}
		} else {
			// Check if this capability is required by any other selected capability
			const isRequiredBy =
				capabilities.filter(
					(c) => selectedCapabilities.includes(c.id) && c.dependencies?.includes(capabilityId)
				).length > 0;

			if (isRequiredBy) {
				// Don't allow deselection if another selected capability depends on it
				return;
			}

			removeCapabilityAndDependents(capabilityId);
		}
	}

	function handleConfigurationChange(event) {
		const { capabilityId, config } = event.detail;
		configuration[capabilityId] = config;
	}

	// Project configuration handlers
	function handleProjectNameChange(event) {
		projectName = event.target.value;
	}

	function handleRepositoryUrlChange(event) {
		repositoryUrl = event.target.value;
	}

	// Load capabilities on mount (only if not provided by server)
	onMount(async () => {
		// If we already have capabilities from server, don't fetch again
		if (data.capabilities && data.capabilities.length > 0) {
			loading = false;
			return;
		}

		try {
			loading = true;
			const response = await fetch('/projects/genproj/api/capabilities');

			if (!response.ok) {
				throw new Error(`Failed to load capabilities: ${response.status}`);
			}

			const fetchData = await response.json();
			capabilities = fetchData.capabilities;
		} catch (err) {
			error = err.message;
			logger.error('Failed to load capabilities', { error: err.message });
		} finally {
			loading = false;
		}
	});

	// Generate project handler
	function handleGenerateProject() {
		// Show login modal for unauthenticated users
		showLoginModal = true;
	}

	// Get disabled state message
	function getDisabledMessage() {
		if (!projectName || projectName.length < 3) {
			return 'Please enter a project name (at least 3 characters)';
		}
		if (selectedCapabilities.length === 0) {
			return 'Please select at least one capability';
		}
		return '';
	}

	// Check if button is disabled
	let isDisabled = $derived.by(
		() => !projectName || projectName.length < 3 || selectedCapabilities.length === 0
	);

	// Demo mode banner - show only when user is not authenticated
	let showDemoBanner = $derived(!data.isAuthenticated);

	// Login modal state
	let showLoginModal = $state(false);

	function closeLoginModal() {
		showLoginModal = false;
	}

	async function handleLogin() {
		await initiateGoogleAuth('/projects/genproj');
	}

	async function handleSignInClick() {
		await initiateGoogleAuth('/projects/genproj');
	}
</script>

<svelte:head>
	<title>Project Generator</title>
	<meta name="description" content="Generate new development projects with selected capabilities" />
</svelte:head>

<div class="min-h-screen bg-zinc-900 flex flex-col">
	<Header />

	<!-- Demo Mode Banner -->
	{#if showDemoBanner}
		<div class="bg-blue-900 bg-opacity-40 border-b border-blue-500">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="flex items-center">
							<svg
								class="h-5 w-5 text-blue-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<span class="text-sm font-medium text-blue-300 ml-2">Demo Mode</span>
						</div>
						<p class="text-sm text-blue-200">
							Explore the tool without logging in. Sign in to generate projects.
						</p>
					</div>
					<button
						onclick={handleSignInClick}
						class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors border border-green-400"
					>
						Sign In to Generate
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Main Content -->
	<main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
		<!-- Page Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-white">Project Generator</h1>
			<p class="mt-2 text-gray-300">
				Configure and generate new development projects with selected capabilities
			</p>
		</div>
		{#if loading}
			<div class="flex justify-center items-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
				<span class="ml-3 text-white">Loading capabilities...</span>
			</div>
		{:else if error}
			<div class="bg-red-900 bg-opacity-20 border border-red-500 rounded-md p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-300">Error loading capabilities</h3>
						<div class="mt-2 text-sm text-red-200">
							<p data-testid="error-message">{error}</p>
						</div>
						<div class="mt-4">
							<button
								data-testid="retry-button"
								class="bg-red-600 text-red-50 px-3 py-2 rounded-md text-sm hover:bg-red-700 transition-colors border border-red-400"
								onclick={() => window.location.reload()}
							>
								Retry
							</button>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Project Configuration Form -->
			<div class="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6 mb-8">
				<h2 class="text-xl font-semibold text-white mb-4">Project Configuration</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Project Name -->
					<div>
						<label for="project-name" class="block text-sm font-medium text-gray-300 mb-2">
							Project Name <span class="text-xs text-gray-400"
								>(optional for preview, required for generation)</span
							>
						</label>
						<input
							id="project-name"
							data-testid="project-name-input"
							type="text"
							bind:value={projectName}
							oninput={handleProjectNameChange}
							placeholder="my-project"
							class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
							aria-label="Project name"
						/>
						{#if projectName && projectName.length < 3}
							<p data-testid="project-name-error" class="mt-1 text-sm text-red-400">
								Project name must be at least 3 characters long
							</p>
						{/if}
					</div>

					<!-- Repository URL -->
					<div>
						<label for="repository-url" class="block text-sm font-medium text-gray-300 mb-2">
							Repository URL
							<span class="text-xs text-gray-400 ml-2">(leave empty to create new)</span>
						</label>
						<input
							id="repository-url"
							data-testid="repository-url-input"
							type="url"
							bind:value={repositoryUrl}
							oninput={handleRepositoryUrlChange}
							placeholder="https://github.com/user/repo"
							class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
							aria-label="Repository URL"
						/>
						<p class="mt-1 text-xs text-gray-400">
							Leave empty to create a new GitHub repository, or provide an existing repository URL
							to add files
						</p>
						{#if repositoryUrl && !repositoryUrl.includes('github.com')}
							<p data-testid="repository-url-error" class="mt-1 text-sm text-red-400">
								Repository URL must be a valid GitHub URL
							</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Tab Navigation -->
			<div class="bg-gray-800 border border-gray-700 rounded-lg shadow-sm mb-8">
				<div class="border-b border-gray-700">
					<nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
						<button
							data-testid="capabilities-tab"
							class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
							'capabilities'
								? 'border-green-400 text-green-400'
								: 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'}"
							onclick={() => switchTab('capabilities')}
							role="tab"
							aria-selected={activeTab === 'capabilities'}
						>
							Capabilities
						</button>
						<button
							data-testid="preview-tab"
							class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
							'preview'
								? 'border-green-400 text-green-400'
								: 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'}"
							onclick={() => switchTab('preview')}
							role="tab"
							aria-selected={activeTab === 'preview'}
						>
							Preview
						</button>
					</nav>
				</div>

				<!-- Tab Content -->
				<div class="p-6">
					{#if activeTab === 'capabilities'}
						<div data-testid="capability-selector">
							<CapabilitySelector
								{capabilities}
								{selectedCapabilities}
								{configuration}
								on:capabilityToggle={handleCapabilityToggle}
								on:configurationChange={handleConfigurationChange}
							/>
						</div>
					{:else if activeTab === 'preview'}
						<div data-testid="preview-content">
							<PreviewMode
								{projectName}
								{repositoryUrl}
								{selectedCapabilities}
								{configuration}
								{capabilities}
							/>
						</div>
					{/if}
				</div>
			</div>

			<!-- Generate Button -->
			<div class="flex flex-col items-center gap-2">
				<button
					data-testid="generate-button"
					class="px-8 py-3 rounded-md font-medium transition-colors border {isDisabled
						? 'bg-gray-700 text-gray-400 cursor-not-allowed border-gray-600'
						: 'bg-green-600 text-white hover:bg-green-700 border-green-400'}"
					disabled={isDisabled}
					onclick={handleGenerateProject}
					aria-label={isDisabled ? getDisabledMessage() : 'Generate project'}
					title={isDisabled ? getDisabledMessage() : ''}
				>
					Generate Project
				</button>
				{#if isDisabled}
					<p class="text-sm text-gray-400 text-center" data-testid="disabled-message">
						{getDisabledMessage()}
					</p>
				{/if}
			</div>
		{/if}
	</main>

	<!-- Login Modal -->
	{#if showLoginModal}
		<div
			data-testid="login-modal"
			class="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50"
		>
			<div
				class="relative top-20 mx-auto p-5 border border-gray-700 w-96 shadow-lg rounded-md bg-gray-800"
			>
				<div class="mt-3 text-center">
					<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
						<svg
							class="h-6 w-6 text-green-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
							/>
						</svg>
					</div>
					<h3 class="text-lg font-medium text-white mt-2">Authentication Required</h3>
					<div class="mt-2 px-7 py-3">
						<p class="text-sm text-gray-300">
							Please sign in to generate your project with the selected capabilities.
						</p>
					</div>
					<div class="items-center px-4 py-3">
						<button
							class="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 border border-green-400"
							onclick={handleLogin}
						>
							Sign in with Google
						</button>
						<button
							class="mt-3 px-4 py-2 bg-gray-700 text-gray-300 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-600 border border-gray-600"
							onclick={closeLoginModal}
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<Footer />
</div>

<style>
	/* Additional styles if needed */
</style>
