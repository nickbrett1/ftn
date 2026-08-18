<script>
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ArticleContent from './stripe-toddler.svx';
	const { data } = $props();
</script>

<svelte:head>
	<title>My toddler has a store. Stripe runs the payments. The process beat the model.</title>
	<meta
		name="description"
		content="I built my 3-year-old a real point-of-sale system on Stripe hardware — and spec-driven development finally worked. The proof: it ran on a model at roughly a thirtieth of the price of last time's."
	/>
</svelte:head>

<Header />

<div class="min-h-screen bg-base-900 text-white">
	<article class="container mx-auto p-4 space-y-8 max-w-6xl prose prose-invert lg:prose-xl">
		<ArticleContent {data} />
	</article>
</div>

<Footer />
