<script>
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount, afterUpdate } from 'svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import mermaid from 'mermaid';
	import { GithubBrands } from 'svelte-awesome-icons'; // Keep if used in header
	import ArticleContent from './article.md'; // Import the mdsvex component

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
	<header class="mb-12 mt-8">
		<!-- Breadcrumbs -->
		<div class="text-sm text-gray-400 mb-4">
			<a href="/" class="hover:underline">home</a> /
			<a href="/projects" class="hover:underline">projects</a> /
			<span class="text-white">dbt-duckdb</span>
		</div>

		<!-- Title, Description, and Right-hand Info Block -->
		<div class="flex flex-col md:flex-row md:justify-between md:items-start gap-8">
			<div class="flex-grow">
				<h1 class="text-4xl font-bold text-white !mb-3">
					Modern Data Transformation without a Data Warehouse: A dbt and DuckDB approach
				</h1>
				<p class="text-lg text-gray-400">
					Leveraging dbt-core and DuckDB for efficient, maintainable, and low-cost data pipelines.
				</p>
			</div>
			<!-- Right-hand info section -->
			<div class="flex-shrink-0 md:w-64 space-y-4">
				<!-- View Code Link -->
				<a
					href="https://github.com/nickbrett1/dbt-duckdb"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center justify-center w-full bg-gray-700 hover:bg-gray-600 border border-green-800 text-white font-semibold py-2 px-4 rounded transition-colors space-x-2"
				>
					<GithubBrands class="w-5 h-5" />
					<span>Check out the code</span>
				</a>
				<!-- Technology Pills -->
				<div class="flex flex-wrap gap-2 justify-center md:justify-start">
					<span class="bg-gray-600 text-gray-300 text-xs font-medium px-2.5 py-0.5 rounded-full"
						>dbt</span
					>
					<span class="bg-gray-600 text-gray-300 text-xs font-medium px-2.5 py-0.5 rounded-full"
						>DuckDB</span
					>
					<span class="bg-gray-600 text-gray-300 text-xs font-medium px-2.5 py-0.5 rounded-full"
						>Cloudflare</span
					>
				</div>
			</div>
		</div>
	</header>

	<!-- Render the article content -->
	<ArticleContent />
</article>
