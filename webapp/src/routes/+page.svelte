<script>
	import Header from '$lib/components/Header.svelte';
	import Landing from '$lib/components/Landing.svelte';
	import About from '$lib/components/About.svelte';
	import Projects from '$lib/components/Projects.svelte';
	import Experience from '$lib/components/Experience.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Contact from '$lib/components/Contact.svelte';
	import Navbar from '$lib/components/Navbar.svelte';

	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	const scrollToHash = (hash, source) => {
		if (hash) {
			// Use a short timeout to allow the browser to complete rendering and layout adjustments.
			// This helps ensure the scroll target is in its final position.
			setTimeout(() => {
				const targetId = hash.substring(1);
				const element = document.getElementById(targetId);

				if (element) {
					console.log(`Scrolling to element ${targetId} from ${source}`);
					element.scrollIntoView({ behavior: 'smooth', block: 'start' });
				} else {
					console.log(`Element ${targetId} not found for scrolling from ${source}`);
				}
			}, 100); // 100ms
		}
	};

	let BackgroundComponent;

	onMount(async () => {
		const module = await import('$lib/components/Background.svelte');
		BackgroundComponent = module.default;

		if (browser && typeof window !== 'undefined' && window.location.hash) {
			scrollToHash(window.location.hash, 'onMount');
		}
	});

	afterNavigate((navigation) => {
		if (browser && typeof window !== 'undefined' && navigation.to && navigation.to.hash) {
			console.log('afterNavigate: Attempting to scroll to hash:', navigation.to.hash);
			scrollToHash(navigation.to.hash, 'afterNavigate');
		}
	});
</script>

<svelte:head>
	<title>Fintech Nick</title>
	<meta
		name="description"
		content="Nick Brett's personal website and portfolio, focused on financial technology."
	/>
</svelte:head>

{#if BackgroundComponent}
	<svelte:component this={BackgroundComponent} />
{/if}

<Navbar />
<div id="home" class="flex flex-col h-dvh min-h-max section">
	<Header />
	<Landing />
</div>
<div class="flex flex-col mx-auto gap-y-24 px-4 md:px-6 max-w-7xl pt-8">
	<div id="about" class="section">
		<About />
	</div>
	<div id="projects" class="section">
		<Projects />
	</div>
	<div id="experience" class="section">
		<Experience />
	</div>
	<div id="contact" class="section">
		<Contact />
	</div>
</div>
<Footer />
