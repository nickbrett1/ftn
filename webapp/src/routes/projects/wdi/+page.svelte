<script>
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { DatabaseSolid } from 'svelte-awesome-icons';
	import tippy from 'tippy.js';
	import 'tippy.js/dist/tippy.css';
	import Navbar from '$lib/components/Navbar.svelte';

	// Receive the 'data' prop from SvelteKit's load function using $props()
	const { data } = $props();

	const totalCountries = $derived(data.totalCountries);
	const dataPointsPerYearChart = $derived(data.dataPointsPerYearChart);
	const totalIndicators = $derived(data.totalIndicators);
	const error = $derived(data.error);

	import Card from '$lib/components/Card.svelte';
	let apexChartInstance = $state(null);
	let chartElementId = 'wdi-data-points-chart'; // Unique ID for the chart element

	onMount(async () => {
		if (browser) {
			const module = await import('apexcharts');
			const ApexCharts = module.default;

			if (dataPointsPerYearChart?.series?.[0]?.data?.length > 0) {
				const chartEl = document.getElementById(chartElementId);
				if (chartEl) {
					const options = {
						series: dataPointsPerYearChart.series,
						chart: {
							type: 'bar',
							height: 350,
							toolbar: { show: true },
							foreColor: '#A0AEC0' /* gray-500 for axis text */
						},
						plotOptions: {
							bar: {
								horizontal: false,
								columnWidth: '55%',
								endingShape: 'rounded'
							}
						},
						colors: ['#166534'], // Set bar color to Tailwind green-800 (hex for #16a34a is green-600, #166534 is green-800)
						dataLabels: { enabled: false },
						xaxis: { type: 'category', title: { text: 'Year', style: { color: '#A0AEC0' } } },
						yaxis: { title: { text: 'Number of Data Points', style: { color: '#A0AEC0' } } },
						theme: { mode: $page.data.colorScheme === 'dark' ? 'dark' : 'light' }
					};
					apexChartInstance = new ApexCharts(chartEl, options);
					await apexChartInstance.render();
				}
			}

			// Initialize tippy for the new icon
			tippy('#dbt-schema-link', {
				content: 'Database (dbt) schema'
			});
		}
	});

	onDestroy(() => {
		if (apexChartInstance) {
			apexChartInstance.destroy();
		}
	});
</script>

<svelte:head>
	<title>WDI Data Profile</title>
	<meta
		name="description"
		content="A small data profile of the World Development Indicators data."
	/>
</svelte:head>

<Navbar />

<article class="container mx-auto p-4 space-y-8 prose prose-invert lg:prose-xl max-w-6xl">
	<header class="mb-12 mt-8">
		<!-- Breadcrumbs -->
		<div class="text-sm text-gray-400 mb-4">
			<button class="hover:underline" onclick={() => navigateTo('/')}>home</button> /
			<button class="hover:underline" onclick={() => navigateTo('/projects')}>projects</button> /
			<span class="text-white">wdi</span>
		</div>

		<!-- Title, Description, and Right-hand Info Block -->
		<div class="flex flex-col md:flex-row md:justify-between md:items-start gap-8">
			<div class="flex-grow">
				<h1 class="text-4xl font-bold text-white !mb-2">
					World Development Indicators: A Data Journey
				</h1>
				<p class="text-lg text-gray-400">
					An exploration of the World Development Indicators dataset, from acquisition to analysis.
				</p>
			</div>
			<!-- Right-hand info section -->
			<div class="flex-shrink-0 md:w-64 space-y-4">
				<!-- View Code Link -->
				<a
					href="/projects/wdi/dbt"
					id="dbt-schema-link"
					class="block w-full text-center bg-green-800 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
				>
					View dbt Project
				</a>
				<!-- Technology Pills -->
				<div class="flex flex-wrap gap-2 justify-center md:justify-start">
					<span class="bg-blue-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full"
						>dbt</span
					>
					<span class="bg-orange-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full"
						>Cloudflare</span
					>
					<!-- Add other relevant technologies -->
				</div>
			</div>
		</div>
	</header>

	{#if error}
		<section
			class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
			role="alert"
		>
			<h2 class="font-bold text-xl">Error Loading Data</h2>
			<span class="block sm:inline">{error}</span>
			<p>Please try refreshing the page or contact support if the issue persists.</p>
		</section>
	{:else}
		<section>
			<h2 class="text-2xl font-semibold text-white">Introduction</h2>
			<p>
				<!-- Add your introductory text here -->
				This article details the process of acquiring, processing, and visualizing data from the World
				Development Indicators (WDI) dataset.
			</p>
			<p>
				The World Development Indicators (WDI) is the primary collection of development indicators,
				compiled from officially-recognized international sources. It presents the most current and
				accurate global development data available, and includes national, regional, and global
				estimates.
			</p>
		</section>

		<section class="mt-8">
			<h2 class="text-2xl font-semibold text-white">Data Overview</h2>
			<p>
				<!-- Describe the data source and its significance -->
				Before diving into the analysis, let's look at the scope of the data we're working with. The
				dataset covers a vast number of countries and indicators over many years.
			</p>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
				<Card disableHoverGlow={true}>
					<div class="w-full">
						<h3 class="text-xl font-semibold mb-2 text-white">Total Countries Tracked</h3>
						<div>
							<p class="text-4xl font-semibold text-white">{totalCountries || 'N/A'}</p>
						</div>
					</div>
				</Card>

				<Card disableHoverGlow={true}>
					<div class="w-full">
						<h3 class="text-xl font-semibold mb-2 text-white">Total Indicators Tracked</h3>
						<div>
							<p class="text-4xl font-semibold text-white">
								{totalIndicators || 'N/A'}
							</p>
						</div>
					</div>
				</Card>

				<Card disableHoverGlow={true} class="md:col-span-2">
					<div class="w-full">
						<h3 class="text-xl font-semibold mb-2 text-white">
							{dataPointsPerYearChart?.title || 'Data Points Per Year'}
						</h3>
						<div class="min-h-[350px]">
							{#if !browser}
								<p class="text-white">Chart will render on client.</p>
							{:else if dataPointsPerYearChart?.series?.[0]?.data?.length > 0}
								<div id={chartElementId}></div>
							{:else if browser && !dataPointsPerYearChart?.series?.[0]?.data?.length > 0 && apexChartInstance}
								<p class="text-white">Chart rendered, but no data points.</p>
							{:else}
								<p class="text-white">No data available for the data points per year chart.</p>
							{/if}
						</div>
					</div>
				</Card>
				<!-- Card containing the chart -->
			</div>
			<!-- Closes the grid div for cards -->
		</section>
		<!-- Closes the "Data Overview" section -->
	{/if}
	<!-- Closes the main #if error block -->
</article>
