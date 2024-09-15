<script>
	import Header from '$lib/components/Header.svelte';
	import Background from '$lib/components/Background.svelte';
	import Landing from '$lib/components/Landing.svelte';
	import Timeline from '$lib/components/Timeline.svelte';
</script>

<Background />

<div class="flex flex-col h-dvh">
	<Header />
	<Landing />
</div>

<div class="h-max flex flex-col">
	<div
		class="text-white z-10 py-10 text-center sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-10xl font-bold"
	>
		Let Me Introduce Myself
	</div>
	<div class="flex grow items-center">
		<Timeline />
	</div>
</div>
