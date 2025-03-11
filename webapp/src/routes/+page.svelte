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
</script>

<Background />

<Navbar />
<div class="flex flex-col h-dvh min-h-max">
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
