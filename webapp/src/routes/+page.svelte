<script>
	import Header from '$lib/components/Header.svelte';
	import Background from '$lib/components/Background.svelte';
	import Landing from '$lib/components/Landing.svelte';
</script>

<Background />

<div class="flex flex-col grow h-dvh min-h-max overflow-visible">
	<Header />
	<Landing />
</div>
