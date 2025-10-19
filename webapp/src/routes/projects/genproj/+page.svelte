<!--
	genproj/+page.svelte
	
	Main page for the genproj tool - User Story 1.
	Displays all available project capabilities and enables selection.
	
	Features:
	- Capability browsing without authentication
	- Real-time capability selection
	- Dependency resolution
	- Responsive design
	- Accessibility support
-->

<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import CapabilitySelector from '$lib/components/genproj/CapabilitySelector.svelte';
	import { capabilityActions } from '$lib/client/capability-store.js';
	import Button from '$lib/components/Button.svelte';

	// Props from server-side load function
	export let data;

	// Reactive state
	let loading = false;
	let error = null;
	let capabilities = data?.capabilities || [];
	let categories = data?.categories || {};
	let selectedCapabilities = data?.selectedCapabilities || [];

	// Initialize store with server data
	onMount(() => {
		if (selectedCapabilities.length > 0) {
			capabilityActions.setSelectedCapabilities(selectedCapabilities);
		}
	});

	/**
	 * Handles capability selection changes
	 * @param {CustomEvent} event - Event containing capability changes
	 */
	function handleCapabilitiesChanged(event) {
		const { selectedCapabilities: newSelection } = event.detail;
		selectedCapabilities = newSelection;

		// Update store
		capabilityActions.setSelectedCapabilities(newSelection);
	}

	/**
	 * Handles clear selection action
	 */
	function handleClearSelection() {
		selectedCapabilities = [];
		capabilityActions.setSelectedCapabilities([]);
	}

	/**
	 * Handles continue to configuration
	 */
	function handleContinue() {
		if (selectedCapabilities.length === 0) {
			alert('Please select at least one capability to continue.');
			return;
		}

		goto('/projects/genproj/configure');
	}

	/**
	 * Handles skip to preview (for demo purposes)
	 */
	function handleSkipToPreview() {
		goto('/projects/genproj/preview');
	}
</script>

<svelte:head>
	<title>Project Generator - Choose Capabilities</title>
	<meta
		name="description"
		content="Select the capabilities you want to include in your new project. Choose from development tools, CI/CD, testing, and more."
	/>
</svelte:head>

<div class="genproj-page">
	{#if error}
		<!-- Error State -->
		<div class="flex items-center justify-center min-h-96">
			<div class="text-center max-w-md">
				<div
					class="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4"
				>
					<svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-white mb-2">Failed to Load Capabilities</h3>
				<p class="text-gray-300 mb-4">{error}</p>
				<Button variant="primary" onclick={() => window.location.reload()}>Try Again</Button>
			</div>
		</div>
	{:else}
		<!-- Main Content -->
		<div class="space-y-8">
			<!-- Introduction -->
			<div class="text-center max-w-4xl mx-auto">
				<h1 class="text-4xl font-bold text-white mb-4">Generate Your Perfect Project</h1>
				<p class="text-xl text-gray-300 mb-8">
					Choose the capabilities you want to include in your new project. We'll generate all the
					necessary files and configurations for you.
				</p>

				<!-- Quick Stats -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
						<div class="text-2xl font-bold text-green-400 mb-2">
							{capabilities.length}
						</div>
						<div class="text-gray-300">Available Capabilities</div>
					</div>
					<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
						<div class="text-2xl font-bold text-green-400 mb-2">
							{Object.keys(categories).length}
						</div>
						<div class="text-gray-300">Categories</div>
					</div>
					<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
						<div class="text-2xl font-bold text-green-400 mb-2">
							{selectedCapabilities.length}
						</div>
						<div class="text-gray-300">Selected</div>
					</div>
				</div>
			</div>

			<!-- Capability Selector -->
			<CapabilitySelector
				{selectedCapabilities}
				on:capabilitiesChanged={handleCapabilitiesChanged}
				on:clearSelection={handleClearSelection}
			/>

			<!-- Action Buttons -->
			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
				<Button
					variant="success"
					size="lg"
					disabled={selectedCapabilities.length === 0}
					onclick={handleContinue}
				>
					Continue to Configuration →
				</Button>

				<Button variant="secondary" size="lg" onclick={handleSkipToPreview}>Skip to Preview</Button>
			</div>

			<!-- Help Text -->
			<div class="text-center text-sm text-gray-300 max-w-2xl mx-auto">
				<p>
					💡 <strong>Tip:</strong> You can preview what will be generated before committing to create
					your project. No authentication is required for browsing capabilities or previewing generated
					files.
				</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.genproj-page {
		min-height: calc(100vh - 200px);
	}

	/* Smooth transitions */
	button {
		transition: all 0.2s ease-in-out;
	}

	/* Focus styles for accessibility */
	button:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.genproj-page {
			padding: 1rem;
		}

		h1 {
			font-size: 2rem;
		}

		p {
			font-size: 1rem;
		}
	}
</style>
