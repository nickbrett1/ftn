<script>
	import Header from '$lib/components/Header.svelte';
	import Background from '$lib/components/Background.svelte';
	import Landing from '$lib/components/Landing.svelte';
	import About from '$lib/components/About.svelte';
	import Projects from '$lib/components/Projects.svelte';

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

<div class="flex flex-col grow h-dvh min-h-max overflow-visible">
	<Header />
	<Landing />
	<About />
	<Projects />
</div>
