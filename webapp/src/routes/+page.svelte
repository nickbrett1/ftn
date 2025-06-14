<script>
	import Header from '$lib/components/Header.svelte';
	import Background from '$lib/components/Background.svelte';
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
			}, 100); // Adjusted delay, 100ms is often a good starting point.
		}
	};

	onMount(() => {
		if (browser && window.location.hash) {
			// Handle initial page load with a hash
			console.log('onMount: Attempting to scroll to initial hash:', window.location.hash);
			scrollToHash(window.location.hash, 'onMount');
		}
	});

	afterNavigate((navigation) => {
		if (browser && navigation.to && navigation.to.hash) {
			console.log('afterNavigate: Attempting to scroll to hash:', navigation.to.hash);
			scrollToHash(navigation.to.hash, 'afterNavigate');
		}
	});
</script>

<Background />

<Navbar />
<div id="home" class="flex flex-col h-dvh min-h-max section">
	<Header />
	<Landing />
</div>
<div class="overflow-hidden flex flex-col mx-auto gap-y-24 px-4 md:px-6 max-w-7xl pt-8">
	<About />
	<Projects />
	<Experience />
	<Contact />
</div>
<Footer />
