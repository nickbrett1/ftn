<script>
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ArticleContent from './speckit-dev.svx';
	const { data } = $props();
</script>

<svelte:head>
	<title>Spec Kit Driven Development</title>
	<meta
		name="description"
		content="What I learned using Spec Kit to build a project generation wizard"
	/>
</svelte:head>

<Header />

<div class="min-h-screen bg-base-900 text-white">
	<article class="container mx-auto p-4 space-y-8 max-w-6xl prose prose-invert lg:prose-xl">
		<ArticleContent {data} />
	</article>
</div>

<Footer />
