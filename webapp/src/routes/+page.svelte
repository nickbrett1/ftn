<script>
	import Header from '$lib/components/Header.svelte';
	import Background from '$lib/components/Background.svelte';
	import Landing from '$lib/components/Landing.svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import Saos from 'saos';
</script>

<Background />

<div class="flex flex-col h-dvh">
	<Header />
	<Landing />
</div>

<div class="flex flex-col justify-center items-center grow">
	<Saos
		animation={'puff-in-center 0.7s cubic-bezier(0.470, 0.000, 0.745, 0.715) both'}
		top={250}
		bottom={250}
	>
		<div
			class="text-white z-10 py-5 max-w-4xl text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-10xl font-black text-center"
		>
			Let Me Introduce Myself
		</div>
	</Saos>
	<div class="flex grow items-center">
		<!-- <Timeline /> -->
	</div>
</div>

<style>
	@keyframes -global-puff-in-center {
		0% {
			transform: scale(2);
			filter: blur(4px);
			opacity: 0;
		}
		100% {
			transform: scale(1);
			filter: blur(0px);
			opacity: 1;
		}
	}
</style>
