<script>
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ArticleContent from './stripe-toddler.svx';
	const { data } = $props();
</script>

<svelte:head>
	<title>My toddler has a store. Stripe runs the payments. I built it from my phone.</title>
	<meta
		name="description"
		content="Building my 3-year-old a real iPad point-of-sale on Stripe hardware — powered by validated spec artifacts and a phone-first agent workflow that turned iteration into a 30-second loop."
	/>
</svelte:head>

<Header />

<div class="min-h-screen bg-base-900 text-white">
	<article class="container mx-auto p-4 space-y-8 max-w-6xl prose prose-invert lg:prose-xl">
		<ArticleContent {data} />
	</article>
</div>

<Footer />
