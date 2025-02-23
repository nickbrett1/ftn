<script>
	import Header from '$lib/components/Header.svelte';
	import Background from '$lib/components/Background.svelte';
	import Landing from '$lib/components/Landing.svelte';
	import About from '$lib/components/About.svelte';
	import Projects from '$lib/components/Projects.svelte';
	import Experience from '$lib/components/Experience.svelte';
	import Footer from '$lib/components/Footer.svelte';

	function getScrollPercent() {
		let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
		let scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
		let clientHeight = document.documentElement.clientHeight;

		return scrollTop / (scrollHeight - clientHeight);
	}
	let percentageScroll = $state(0);
</script>

<svelte:window
	onscroll={() => {
		percentageScroll = getScrollPercent();
		console.log('percentageScroll:', percentageScroll);
	}}
/>

<Background />

<div class="flex flex-col h-dvh min-h-max">
	<Header />
	<Landing />
</div>
<div class="flex flex-col mx-auto gap-y-24 px-4 md:px-6 max-w-7xl">
	<About />
	<Projects />
	<Experience />
	<Footer />
</div>
