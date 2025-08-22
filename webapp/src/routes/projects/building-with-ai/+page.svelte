<script>
	import Navbar from '$lib/components/Navbar.svelte';
	import Header from '$lib/components/Header.svelte';
	import ArticleContent from './building-with-ai.svx';
	const { data } = $props();
</script>

<svelte:head>
	<title>Building with AI Agents: Lessons from a 14,500-Line Project</title>
	<meta
		name="description"
		content="What I learned using Cursor's agent mode to build a personal finance tool - insights into AI-assisted development workflows."
	/>
</svelte:head>

<Header />
<Navbar active="projects" />

<article class="container mx-auto p-4 space-y-8 max-w-6xl prose prose-invert lg:prose-xl">
	<ArticleContent {data} />
</article>
