<script>
	import DesktopNavigation from '$lib/components/DesktopNavigation.svelte';
	import MobileNavigation from '$lib/components/MobileNavigation.svelte';

	let { active = 'home' } = $props();
	const items = ['home', 'about', 'projects', 'experience', 'contact'];

	async function setActive() {
		const { default: mostVisible } = await import('most-visible');

		let currentlyActive = mostVisible(document.querySelectorAll('.section'));

		if (currentlyActive && currentlyActive.id) {
			active = currentlyActive.id;
		}
	}
</script>

<svelte:window
	on:scroll={() => {
		setActive();
	}}
/>

<div class="fixed top-3 w-full z-40 pointer-events-none">
	<div class="flex flex-1 md:justify-center">
		<DesktopNavigation {items} bind:active class="pointer-events-auto hidden md:block" />
	</div>
</div>

<!--
<div class="fixed bottom-6 right-0 z-40">
	<MobileNavigation {items} bind:active class="pointer-events-auto md:hidden mt-10" />
</div>
-->
