<script>
	import Navbar from '$lib/components/Navbar.svelte';
	import ArticleContent from './dbt-duckdb.svx';
	export let data;
</script>

<svelte:head>
	<title>Modern ETL without a Data Warehouse: A dbt and DuckDB Approach</title>
	<meta
		name="description"
		content="Learn how to build efficient data transformation pipelines using dbt-core and DuckDB, avoiding data warehouse complexities."
	/>
</svelte:head>

<article class="container mx-auto p-4 space-y-8 max-w-6xl prose prose-invert lg:prose-xl">
	<div class="mb-12 mt-2">
		<!-- Breadcrumbs -->
		<div class="text-sm text-gray-400 mb-4">
			<a href="/" class="hover:underline">home</a> / <a href="/#projects" class="hover:underline">projects</a> /
			<span class="text-white">dbt-duckdb</span>
		</div>
	</div>

	<!-- Render the article content -->
	<ArticleContent {data} />
</article>
