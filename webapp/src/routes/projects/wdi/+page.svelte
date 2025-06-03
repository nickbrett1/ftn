<script>
	// import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'; // Assuming you'll use Shadcn or similar
	// Removed Shadcn Table imports - we'll use basic HTML table elements
	// import SvelteApexCharts from 'svelte-apexcharts'; // Removed static import
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	$: ({ totalCountries, dataPointsPerYearChart, topCoverageIndicators, error } = data);

	let SvelteApexCharts = null;

	onMount(async () => {
		if (browser) {
			const module = await import('svelte-apexcharts');
			SvelteApexCharts = module.default; // Or specific named export if not default
		}
	});
</script>

<svelte:head>
	<title>WDI Data Coverage</title>
	<meta name="description" content="Overview of World Development Indicators data coverage." />
</svelte:head>

<div class="container mx-auto p-4 space-y-8">
	<h1 class="text-3xl font-bold text-center mb-8">WDI Data Coverage Overview</h1>

	{#if data.error}
		<!-- Basic Card structure using Tailwind CSS -->
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
			<strong class="font-bold">Error Loading Data</strong>
			<span class="block sm:inline">{error}</span>
			<p>Please try refreshing the page or contact support if the issue persists.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Basic Card structure using Tailwind CSS -->
			<div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
				<h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Total Countries Tracked</h2>
				<div>
					<p class="text-4xl font-semibold text-gray-900 dark:text-white">{totalCountries || 'N/A'}</p>
				</div>
			</div>

			<!-- Basic Card structure using Tailwind CSS -->
			<div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
				<h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{dataPointsPerYearChart?.title || 'Data Points Per Year'}</h2>
				<div class="min-h-[350px]">
					{#if browser && SvelteApexCharts && dataPointsPerYearChart?.series?.[0]?.data?.length > 0}
						{@const chartOptions = {
							chart: { type: 'bar', height: 350, toolbar: { show: true } },
							plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
							dataLabels: { enabled: false },
							xaxis: { type: 'category', title: { text: 'Year' } },
							yaxis: { title: { text: 'Number of Data Points' } },
							theme: { mode: $page.data.colorScheme === 'dark' ? 'dark' : 'light' }
						}}
						<svelte:component this={SvelteApexCharts} {options} series={dataPointsPerYearChart.series} />
					{:else if browser && !SvelteApexCharts && dataPointsPerYearChart?.series?.[0]?.data?.length > 0}
						<p class="text-gray-600 dark:text-gray-400">Loading chart...</p>
					{:else}
						<p class="text-gray-600 dark:text-gray-400">No data available for the data points per year chart.</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Basic Card structure using Tailwind CSS -->
		<div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
			<h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Top 10 Indicators by Data Coverage</h2>
			<div>
				<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
					<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
						<tr>
							<th scope="col" class="px-6 py-3">Indicator Name</th>
							<th scope="col" class="px-6 py-3 text-right">Countries with All Years Data</th>
						</tr>
					</thead>
					<tbody>
						{#each topCoverageIndicators as indicator (indicator.indicator_code)}
							<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
								<td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{indicator.indicator_name}</td>
								<td class="px-6 py-4 text-right">{indicator.countries_all_years}</td>
							</tr>
						{:else}
							<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
								<td colspan="2" class="px-6 py-4 text-center text-gray-600 dark:text-gray-400"
									>No indicator coverage data available.</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
