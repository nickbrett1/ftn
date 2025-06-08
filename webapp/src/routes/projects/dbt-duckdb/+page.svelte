<script>
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount, afterUpdate } from 'svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import mermaid from 'mermaid';
	import ArticleContent from '$lib/articles/dbt-duckdb.svx'; // Import the mdsvex component

	onMount(async () => {
		if (browser) {
			mermaid.initialize({
				startOnLoad: false, // We will call run manually
				theme: $page.data.colorScheme === 'dark' ? 'dark' : 'default' // Or 'neutral'
				// securityLevel: 'loose', // Consider if complex diagrams have issues
			});
		}
	});

	afterUpdate(() => {
		if (browser) {
			// Ensure mermaid diagrams are rendered after Svelte has updated the DOM
			// with the content from ArticleRenderer
			mermaid.run({ nodes: document.querySelectorAll('.mermaid') });
		}
	});
</script>

<svelte:head>
	<title>Modern Data Transformation: A dbt and DuckDB Approach</title>
	<meta
		name="description"
		content="Learn how to build efficient data transformation pipelines using dbt-core and DuckDB, avoiding data warehouse complexities."
	/>
</svelte:head>

<Navbar />

<article class="container mx-auto p-4 space-y-8 max-w-6xl prose prose-invert lg:prose-xl">
	<div class="mb-12 mt-8">
		<!-- Breadcrumbs -->
		<div class="text-sm text-gray-400 mb-4">
			<a href="/" class="hover:underline">home</a> /
			<a href="/projects" class="hover:underline">projects</a> /
			<span class="text-white">dbt-duckdb</span>
		</div>
	</div>

	<!-- Render the article content -->
	<ArticleContent />
</article>
