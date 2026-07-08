<script>
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ArticleContent from './agent-charges-surprise.svx';
	const { data } = $props();
</script>

<svelte:head>
	<title>Anatomy of a Runaway Agent Bill: Context Caching & Bloat Postmortem</title>
	<meta
		name="description"
		content="How an autonomous AI agent ran up a surprise credit card bill by dragging a massive CSV into conversation context, and how to prevent it."
	/>
</svelte:head>

<Header />

<div class="min-h-screen bg-base-900 text-white">
	<article class="container mx-auto p-4 space-y-8 max-w-6xl prose prose-invert lg:prose-xl">
		<ArticleContent {data} />
	</article>
</div>

<Footer />
