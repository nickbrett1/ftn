<script>
	import Header from '$lib/components/Header.svelte';
	import Background from '$lib/components/Background.svelte';
	import Landing from '$lib/components/Landing.svelte';
	import Timeline from '$lib/components/Timeline.svelte';

	import { inview } from 'svelte-inview';
	import { fade } from 'svelte/transition';

	let isInView;
	let scrollDirection;
	const options = {
		rootMargin: '-20%',
		unobserveOnEnter: true
	};

	const handleChange = ({ detail }) => {
		isInView = detail.inView;
		scrollDirection = detail.scrollDirection.vertical;
	};
</script>

<Background />

<div class="flex flex-col h-dvh">
	<Header />
	<Landing />
</div>

<div class="flex flex-col justify-center items-center grow">
	<div use:inview={options} on:inview_change={handleChange}>
		<div
			class:animate={isInView}
			class:animateFromBottom={scrollDirection === 'down'}
			class:animateFromTop={scrollDirection === 'up'}
		>
			{#if isInView}
				<div
					in:fade={{ duration: 2000 }}
					class="text-white z-10 py-5 max-w-4xl text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-10xl font-black text-center"
				>
					Let Me Introduce Myself
				</div>
			{:else}
				<div
					class="text-white text-opacity-0 z-10 py-5 max-w-4xl text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-10xl font-black text-center"
				>
					Let Me Introduce Myself
				</div>
			{/if}
		</div>
	</div>
	<div class="flex grow items-center">
		<!-- <Timeline /> -->
	</div>
</div>
