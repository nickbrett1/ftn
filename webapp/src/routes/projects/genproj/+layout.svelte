<!--
	genproj/+layout.svelte
	
	Main layout for the genproj tool pages.
	Provides consistent navigation, header, and footer structure.
	
	Features:
	- Responsive navigation
	- Breadcrumb navigation
	- Progress indicator
	- Error boundary
	- Accessibility support
-->

<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';

	// Reactive state
	let currentStep = 1;
	let totalSteps = 4;
	let breadcrumbItems = [];

	// Update breadcrumb based on current route
	$: {
		breadcrumbItems = [
			{ label: 'Home', href: '/' },
			{ label: 'Projects', href: '/projects' },
			{ label: 'Project Generator', href: '/projects/genproj' }
		];

		// Add current page to breadcrumb
		if ($page.route.id === '/projects/genproj') {
			breadcrumbItems.push({ label: 'Capabilities', href: '/projects/genproj' });
		} else if ($page.route.id === '/projects/genproj/configure') {
			breadcrumbItems.push({ label: 'Configure', href: '/projects/genproj/configure' });
		} else if ($page.route.id === '/projects/genproj/preview') {
			breadcrumbItems.push({ label: 'Preview', href: '/projects/genproj/preview' });
		} else if ($page.route.id === '/projects/genproj/generate') {
			breadcrumbItems.push({ label: 'Generate', href: '/projects/genproj/generate' });
		}
	}

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

<div class="min-h-screen bg-gray-50 flex flex-col">
	<!-- Header -->
	<Header />

	<!-- Main Content -->
	<main class="flex-1">
		<!-- Breadcrumb Navigation -->
		<div class="bg-white border-b border-gray-200">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
				<Breadcrumb items={breadcrumbItems} />
			</div>
		</div>

		<!-- Progress Indicator -->
		{#if $page.route.id.startsWith('/projects/genproj')}
			<div class="bg-white border-b border-gray-200">
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-4">
							<h1 class="text-2xl font-bold text-gray-900">Project Generator</h1>
							<span class="text-sm text-gray-500">
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
											{stepNumber <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}"
										>
											<span class="text-sm font-medium">{stepNumber}</span>
										</div>

										<!-- Connector Line -->
										{#if stepNumber < totalSteps}
											<div
												class="w-12 h-0.5 mx-2
												{stepNumber < currentStep ? 'bg-blue-500' : 'bg-gray-200'}"
											></div>
										{/if}
									</div>
								{/each}
							</div>

							<!-- Step Labels -->
							<div class="flex justify-between mt-2 text-xs text-gray-500">
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
