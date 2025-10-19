<!--
	genproj/+layout.svelte
	
	Main layout for the genproj tool pages.
	Provides consistent navigation, header, and footer structure.
	
	Features:
	- Responsive navigation
	- Progress indicator
	- Error boundary
	- Accessibility support
	- Design system compliance
-->

<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';

	// Reactive state
	let currentStep = 1;
	let totalSteps = 4;

	// Update step based on current route
	$: {
		if ($page.route.id === '/projects/genproj') {
			currentStep = 1;
		} else if ($page.route.id === '/projects/genproj/configure') {
			currentStep = 2;
		} else if ($page.route.id === '/projects/genproj/preview') {
			currentStep = 3;
		} else if ($page.route.id === '/projects/genproj/generate') {
			currentStep = 4;
		}
	}

	onMount(() => {
		// Set page title
		document.title = 'Project Generator - FintechNick';
	});
</script>

<div class="min-h-screen bg-zinc-900 flex flex-col">
	<!-- Header -->
	<Header />

	<!-- Main Content -->
	<main class="flex-1">
		<!-- Progress Indicator -->
		{#if $page.route.id.startsWith('/projects/genproj')}
			<div class="bg-gray-800 border-b border-gray-700">
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-4">
							<h1 class="text-2xl font-bold text-white">Project Generator</h1>
							<span class="text-sm text-gray-300">
								Step {currentStep} of {totalSteps}
							</span>
						</div>

						<!-- Progress Bar -->
						<div class="flex-1 max-w-md ml-8">
							<div class="flex items-center">
								{#each Array(totalSteps) as _, step}
									{@const stepNumber = step + 1}
									<div class="flex items-center">
										<!-- Step Circle -->
										<div
											class="flex items-center justify-center w-8 h-8 rounded-full
											{stepNumber <= currentStep ? 'bg-green-400 text-zinc-900' : 'bg-gray-700 text-gray-300'}"
										>
											<span class="text-sm font-medium">{stepNumber}</span>
										</div>

										<!-- Connector Line -->
										{#if stepNumber < totalSteps}
											<div
												class="w-12 h-0.5 mx-2
												{stepNumber < currentStep ? 'bg-green-400' : 'bg-gray-700'}"
											></div>
										{/if}
									</div>
								{/each}
							</div>

							<!-- Step Labels -->
							<div class="flex justify-between mt-2 text-xs text-gray-300">
								<span>Capabilities</span>
								<span>Configure</span>
								<span>Preview</span>
								<span>Generate</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Page Content -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<ErrorBoundary>
				<slot />
			</ErrorBoundary>
		</div>
	</main>

	<!-- Footer -->
	<Footer />
</div>

<style>
	/* Ensure proper spacing and layout */
	main {
		min-height: calc(100vh - 200px);
	}
</style>
