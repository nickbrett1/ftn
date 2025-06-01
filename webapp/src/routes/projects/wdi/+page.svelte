<script>
	import { goto, afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import WdiTrendChart from '$lib/components/WdiTrendChart.svelte';

	/** @type {import('./$types').PageData} */
	let { data } = $props();

	let selectedCountryCode = $state(data.selectedCountry || '');
	let selectedIndicatorCodes = $state(new Set(data.selectedIndicators || []));

	// Update local state if URL changes (e.g., back/forward button)
	afterNavigate(() => {
		selectedCountryCode = $page.url.searchParams.get('country') || '';
		const indicatorsFromURL = $page.url.searchParams.getAll('indicator');
		selectedIndicatorCodes = new Set(indicatorsFromURL);
	});

	function handleIndicatorChange(event) {
		const { value, checked } = event.target;
		if (checked) {
			selectedIndicatorCodes.add(value);
		} else {
			selectedIndicatorCodes.delete(value);
		}
	}

	function handleSubmit(event) {
		event.preventDefault();
		if (!selectedCountryCode) {
			alert('Please select a country.');
			return;
		}
		if (selectedIndicatorCodes.size === 0) {
			alert('Please select at least one indicator.');
			return;
		}
		const params = new URLSearchParams();
		params.set('country', selectedCountryCode);
		selectedIndicatorCodes.forEach((code) => params.append('indicator', code));
		goto(`?${params.toString()}`, { keepFocus: true });
	}
</script>

<svelte:head>
	<title>WDI Explorer</title>
	<meta name="description" content="Explore World Development Indicators data." />
</svelte:head>

<div class="container mx-auto p-4 md:p-8">
	<h1 class="text-3xl font-bold mb-6 text-white dark:text-gray-50">
		World Development Indicators Explorer
	</h1>

	{#if data.error}
		<p
			class="text-red-600 dark:text-red-400 font-semibold p-4 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md"
		>
			Error loading data: {data.error}
		</p>
	{/if}

	<form onsubmit={handleSubmit} class="mb-10 p-6 bg-gray-800 rounded-lg shadow-xl">
		<div class="grid md:grid-cols-2 gap-6 mb-6">
			<div>
				<label for="country-select" class="block mb-2 text-sm font-medium text-green-400"
					>Select Country:</label
				>
				<select
					id="country-select"
					bind:value={selectedCountryCode}
					class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5"
				>
					<option value="">-- Select a Country --</option>
					{#each data.countries || [] as country (country.country_code)}
						<option value={country.country_code}>{country.country_name}</option>
					{/each}
				</select>
			</div>
		</div>

		<fieldset class="mb-6">
			<legend class="block mb-2 text-sm font-medium text-green-400"
				>Select Indicators (up to 5 recommended):</legend
			>
			<div
				class="max-h-60 overflow-y-auto p-4 bg-gray-700 border border-gray-600 rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"
			>
				{#each data.indicators || [] as indicator (indicator.indicator_code)}
					<label class="flex items-center space-x-2 p-2 hover:bg-gray-600 rounded cursor-pointer">
						<input
							type="checkbox"
							value={indicator.code}
							checked={selectedIndicatorCodes.has(indicator.code)}
							onchange={handleIndicatorChange}
							class="w-4 h-4 text-green-500 bg-gray-600 border-gray-500 rounded focus:ring-green-600 focus:ring-offset-gray-700 focus:ring-2"
						/>
						<span class="text-sm text-gray-200 select-none">{indicator.indicator_name}</span>
					</label>
				{/each}
			</div>
		</fieldset>

		<button
			type="submit"
			class="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50"
			disabled={!selectedCountryCode || selectedIndicatorCodes.size === 0}>Load Chart</button
		>
	</form>

	{#if data.chartData && data.chartData.series.length > 0}
		<WdiTrendChart seriesData={data.chartData.series} chartTitle={data.chartData.title} />
	{:else if selectedCountryCode && selectedIndicatorCodes.size > 0 && !data.error}
		<div
			class="p-6 bg-gray-800 rounded-lg shadow-xl text-center text-gray-400 min-h-[450px] flex items-center justify-center"
		>
			<p>No data available for the selected criteria, or data is still loading.</p>
		</div>
	{/if}
</div>
