<script>
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ArticleContent from './agent-charges-surprise.svx';
	const { data } = $props();
</script>

<svelte:head>
	<title>Runaway AI Agents: 5 Lessons from a $44 Surprise Bill</title>
	<meta
		name="description"
		content="What I learned when an autonomous assistant silently ran up my API costs in minutes, and how to prevent it."
	/>
</svelte:head>

<Header />

<div class="min-h-screen bg-base-900 text-white">
	<article class="container mx-auto p-4 space-y-8 max-w-6xl prose prose-invert lg:prose-xl">
		<ArticleContent {data} />
	</article>
</div>

<Footer />
