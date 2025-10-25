<!--
  @fileoverview Main genproj page component
  @description Two-tab interface for capability selection and preview
-->

<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import CapabilitySelector from '$lib/components/genproj/CapabilitySelector.svelte';
	import PreviewMode from '$lib/components/genproj/PreviewMode.svelte';
	import { logger } from '$lib/utils/logging.js';

	// Reactive state
	let activeTab = 'capabilities';
	let capabilities = [];
	let selectedCapabilities = [];
	let projectName = '';
	let repositoryUrl = '';
	let configuration = {};
	let loading = true;
	let error = null;

	// Tab management
	function switchTab(tab) {
		activeTab = tab;
		logger.info('Tab switched', { tab });
	}

	// Capability selection handlers
	function handleCapabilityToggle(capabilityId, selected) {
		if (selected) {
			selectedCapabilities = [...selectedCapabilities, capabilityId];
		} else {
			selectedCapabilities = selectedCapabilities.filter((id) => id !== capabilityId);
			// Remove configuration for deselected capability
			delete configuration[capabilityId];
		}
		logger.info('Capability toggled', { capabilityId, selected });
	}

	function handleConfigurationChange(capabilityId, config) {
		configuration[capabilityId] = config;
		logger.info('Configuration changed', { capabilityId, config });
	}

	// Project configuration handlers
	function handleProjectNameChange(event) {
		projectName = event.target.value;
		logger.info('Project name changed', { projectName });
	}

	function handleRepositoryUrlChange(event) {
		repositoryUrl = event.target.value;
		logger.info('Repository URL changed', { repositoryUrl });
	}

	// Load capabilities on mount
	onMount(async () => {
		try {
			loading = true;
			const response = await fetch('/projects/genproj/api/capabilities');

			if (!response.ok) {
				throw new Error(`Failed to load capabilities: ${response.status}`);
			}

			const data = await response.json();
			capabilities = data.capabilities;

			logger.success('Capabilities loaded', { count: capabilities.length });
		} catch (err) {
			error = err.message;
			logger.error('Failed to load capabilities', { error: err.message });
		} finally {
			loading = false;
		}
	});

	// Generate project handler
	function handleGenerateProject() {
		logger.info('Generate project requested', {
			projectName,
			selectedCapabilities,
			configuration
		});

		// Show login modal for unauthenticated users
		showLoginModal = true;
	}

	// Login modal state
	let showLoginModal = false;

	function closeLoginModal() {
		showLoginModal = false;
	}

	function handleLogin() {
		window.location.href = '/auth/google';
	}
</script>

<svelte:head>
	<title>Project Generator - FTN</title>
	<meta name="description" content="Generate new development projects with selected capabilities" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center py-6">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Project Generator</h1>
					<p class="mt-2 text-gray-600">
						Configure and generate new development projects with selected capabilities
					</p>
				</div>
				<div class="flex items-center space-x-4">
					<button
						data-testid="login-button"
						class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
						on:click={() => (window.location.href = '/auth/google')}
					>
						Sign in
					</button>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if loading}
			<div class="flex justify-center items-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				<span class="ml-3 text-gray-600">Loading capabilities...</span>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-md p-4">
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
						<h3 class="text-sm font-medium text-red-800">Error loading capabilities</h3>
						<div class="mt-2 text-sm text-red-700">
							<p data-testid="error-message">{error}</p>
						</div>
						<div class="mt-4">
							<button
								data-testid="retry-button"
								class="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm hover:bg-red-200 transition-colors"
								on:click={() => window.location.reload()}
							>
								Retry
							</button>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Project Configuration Form -->
			<div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">Project Configuration</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Project Name -->
					<div>
						<label for="project-name" class="block text-sm font-medium text-gray-700 mb-2">
							Project Name *
						</label>
						<input
							id="project-name"
							data-testid="project-name-input"
							type="text"
							bind:value={projectName}
							on:input={handleProjectNameChange}
							placeholder="my-awesome-project"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							aria-label="Project name"
						/>
						{#if projectName && projectName.length < 3}
							<p data-testid="project-name-error" class="mt-1 text-sm text-red-600">
								Project name must be at least 3 characters long
							</p>
						{/if}
					</div>

					<!-- Repository URL -->
					<div>
						<label for="repository-url" class="block text-sm font-medium text-gray-700 mb-2">
							Repository URL (optional)
						</label>
						<input
							id="repository-url"
							data-testid="repository-url-input"
							type="url"
							bind:value={repositoryUrl}
							on:input={handleRepositoryUrlChange}
							placeholder="https://github.com/user/repo"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							aria-label="Repository URL"
						/>
						{#if repositoryUrl && !repositoryUrl.includes('github.com')}
							<p data-testid="repository-url-error" class="mt-1 text-sm text-red-600">
								Repository URL must be a valid GitHub URL
							</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Tab Navigation -->
			<div class="bg-white rounded-lg shadow-sm border mb-8">
				<div class="border-b border-gray-200">
					<nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
						<button
							data-testid="capabilities-tab"
							class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
							'capabilities'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
							on:click={() => switchTab('capabilities')}
							role="tab"
							aria-selected={activeTab === 'capabilities'}
						>
							Capabilities
						</button>
						<button
							data-testid="preview-tab"
							class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
							'preview'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
							on:click={() => switchTab('preview')}
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
						<CapabilitySelector
							data-testid="capability-selector"
							{capabilities}
							{selectedCapabilities}
							{configuration}
							on:capabilityToggle={handleCapabilityToggle}
							on:configurationChange={handleConfigurationChange}
						/>
					{:else if activeTab === 'preview'}
						<PreviewMode
							data-testid="preview-content"
							{projectName}
							{repositoryUrl}
							{selectedCapabilities}
							{configuration}
							{capabilities}
						/>
					{/if}
				</div>
			</div>

			<!-- Generate Button -->
			<div class="flex justify-center">
				<button
					data-testid="generate-button"
					class="bg-green-600 text-white px-8 py-3 rounded-md font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
					disabled={!projectName || projectName.length < 3 || selectedCapabilities.length === 0}
					on:click={handleGenerateProject}
					aria-label="Generate project"
				>
					Generate Project
				</button>
			</div>
		{/if}
	</main>

	<!-- Login Modal -->
	{#if showLoginModal}
		<div data-testid="login-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
				<div class="mt-3 text-center">
					<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
						<svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
						</svg>
					</div>
					<h3 class="text-lg font-medium text-gray-900 mt-2">Authentication Required</h3>
					<div class="mt-2 px-7 py-3">
						<p class="text-sm text-gray-500">
							Please sign in to generate your project with the selected capabilities.
						</p>
					</div>
					<div class="items-center px-4 py-3">
						<button
							class="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
							on:click={handleLogin}
						>
							Sign in with Google
						</button>
						<button
							class="mt-3 px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
							on:click={closeLoginModal}
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Additional styles if needed */
</style>
