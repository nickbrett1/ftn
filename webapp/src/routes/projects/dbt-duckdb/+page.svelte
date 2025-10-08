<script>
	import Header from '$lib/components/Header.svelte';
	import ArticleContent from './dbt-duckdb.svx';
	const { data } = $props();
</script>

<svelte:head>
	<title>Modern ETL without a Data Warehouse: A dbt and DuckDB Approach</title>
	<meta
		name="description"
		content="Learn how to build efficient data transformation pipelines using dbt-core and DuckDB, avoiding data warehouse complexities."
	/>
</svelte:head>

<Header />

<article class="container mx-auto p-4 space-y-8 max-w-6xl prose prose-invert lg:prose-xl">
	<ArticleContent {data} />
</article>
