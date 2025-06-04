<script>
	// import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'; // Assuming you'll use Shadcn or similar
	// import SvelteApexCharts from 'svelte-apexcharts'; // Removed static import
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import Card from '$lib/components/Card.svelte';
	import { DatabaseSolid } from 'svelte-awesome-icons';
	import tippy from 'tippy.js';
	import 'tippy.js/dist/tippy.css';

	// Receive the 'data' prop from SvelteKit's load function using $props()
	const { data } = $props();

	const totalCountries = $derived(data.totalCountries);
	const dataPointsPerYearChart = $derived(data.dataPointsPerYearChart);
	const totalIndicators = $derived(data.totalIndicators);
	const error = $derived(data.error);

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
						chart: { type: 'bar', height: 350, toolbar: { show: true }, foreColor: '#A0AEC0' /* gray-500 for axis text */ },
						plotOptions: {
							bar: {
								horizontal: false,
								columnWidth: '55%',
								endingShape: 'rounded'
							}
						},
						colors: ['#166534'], // Set bar color to Tailwind green-800 (hex for #16a34a is green-600, #166534 is green-800)
						dataLabels: { enabled: false },
						xaxis: { type: 'category', title: { text: 'Year', style: { color: '#A0AEC0'} } },
						yaxis: { title: { text: 'Number of Data Points', style: { color: '#A0AEC0'} } },
						theme: { mode: $page.data.colorScheme === 'dark' ? 'dark' : 'light' }
					};
					apexChartInstance = new ApexCharts(chartEl, options);
					await apexChartInstance.render();
				}
			}

			// Initialize tippy for the new icon
			tippy('#dbt-schema-link', {
				content: 'Database (dbt) schema',
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
	<meta name="description" content="A small data profile of the World Development Indicators data." />
</svelte:head>

<div class="container mx-auto p-4 space-y-8">
	<div class="flex justify-between items-center mb-8 mt-4">
		<h1 class="text-3xl font-bold text-center text-white">WDI Data Coverage Overview</h1>
		<a
			href="/projects/wdi/dbt"
			id="dbt-schema-link"
			aria-label="Database (dbt) schema"
			class="text-white hover:text-green-300 p-2" 
		>
			<DatabaseSolid class="w-6 h-6" />
		</a>
	</div>

	{#if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
			<strong class="font-bold">Error Loading Data</strong>
			<span class="block sm:inline">{error}</span>
			<p>Please try refreshing the page or contact support if the issue persists.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">

			<Card disableHoverGlow={true}>
				<div class="w-full">
					<h2 class="text-xl font-semibold mb-2 text-white">Total Countries Tracked</h2>
					<div>
						<p class="text-4xl font-semibold text-white">{totalCountries || 'N/A'}</p>
					</div>
				</div>
			</Card>

			<Card disableHoverGlow={true}>
				<div class="w-full">
					<h2 class="text-xl font-semibold mb-2 text-white">Total Indicators Tracked</h2>
					<div>
						<p class="text-4xl font-semibold text-white">
							{totalIndicators || 'N/A'}
						</p>
					</div>
				</div>
			</Card>


			<Card disableHoverGlow={true} class="md:col-span-2">
				<div class="w-full">
					<h2 class="text-xl font-semibold mb-2 text-white">{dataPointsPerYearChart?.title || 'Data Points Per Year'}</h2>
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

			
		</div>
	{/if}

</div>
