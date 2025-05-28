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

<h1>Cloudflare D1 Database Tables (WDI Project)</h1>

{#if data.error}
	<p class="error-message">Error: {data.error}</p>
{:else if data.tables && data.tables.length > 0}
	<p>Here is a list of tables in your D1 database:</p>
	<ul>
		{#each data.tables as table}
			<li>{table}</li>
		{/each}
	</ul>
{:else if data.tables}
	<p>No user-defined tables found in the database, or the database is empty.</p>
{:else}
	<p>Loading table information...</p>
	<!-- This state should ideally not be reached if load function completes -->
{/if}

<style>
	.error-message {
		color: red;
		font-weight: bold;
	}
	ul {
		list-style-type: disc;
		padding-left: 20px;
	}
	li {
		margin-bottom: 0.25em;
	}
</style>
