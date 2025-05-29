<script>
	/** @type {import('./$types').PageData} */
	let { data } = $props();
</script>

<svelte:head>
	<title>WDI - Database Tables</title>
	<meta
		name="description"
		content="Lists tables from the Cloudflare D1 database for the WDI project."
	/>
</svelte:head>

<div class="container mx-auto p-4 md:p-8">
	<h1 class="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-50">
		Cloudflare D1 Database Tables (WDI Project)
	</h1>

	{#if data.error}
		<p
			class="text-red-600 dark:text-red-400 font-semibold p-4 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md"
		>
			Error: {data.error}
		</p>
	{:else if data.tables && data.tables.length > 0}
		<p class="mb-4 text-gray-700 dark:text-gray-300">
			Here is a list of tables in your D1 database:
		</p>
		<ul class="list-disc pl-5 space-y-2">
			{#each data.tables as table}
				<li
					class="p-3 bg-gray-100 dark:bg-gray-700 rounded-md shadow-sm text-gray-800 dark:text-gray-200"
				>
					{table}
				</li>
			{/each}
		</ul>
	{:else if data.tables}
		<p
			class="p-4 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-md text-blue-700 dark:text-blue-300"
		>
			No user-defined tables found in the database, or the database is empty.
		</p>
	{:else}
		<p class="text-gray-600 dark:text-gray-300">Loading table information...</p>
		<!-- This state should ideally not be reached if load function completes -->
	{/if}
</div>
