<script>
	import Header from '$lib/components/Header.svelte';
	import Background from '$lib/components/Background.svelte';
	import Landing from '$lib/components/Landing.svelte';
	import Card from '$lib/components/Card.svelte';
	import LinkedinInBrand from 'svelte-awesome-icons/LinkedinInBrand.svelte';

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

<div class="flex flex-col grow h-dvh min-h-max overflow-visible">
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
					class="text-white z-10 px-8 py-5 max-w-4xl text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-10xl font-black text-center"
				>
					Let Me Introduce Myself
				</div>
			{/if}
		</div>
	</div>
</div>

<div
	class={`w-full 
		min-h-dvh 
		justify-center
		content-center
		items-center
		flex
		flex-col 
		gap-14`}
>
	<div
		class={`m-0 
		gap-2 
		text-white 
		flex 
		flex-row 
		flex-wrap 
		justify-center
		`}
	>
		<Card on:click={() => (window.location.href = '/projects')}>
			<h1 class="text-xl mb-4 leading-none">Making of FinTechNick</h1>
			<p class="text-left">How this site was made</p>
		</Card>
		<Card on:click={() => (window.location.href = '/projects')}>
			<h1 class="text-xl mb-4 leading-none">Machine Learnings on GCP</h1>
			<p class="text-left">A project about machine learning on GCP</p>
		</Card>
		<Card on:click={() => (window.location.href = '/techstack')}>
			<h1 class="text-xl mb-4 leading-none">Tools & Technologies</h1>
			<p class="text-left">Links to useful tools and technologies</p>
		</Card>
		<Card on:click={() => (window.location.href = '/blog')}>
			<h1 class="text-xl mb-4 leading-none">Blog</h1>
			<p class="text-left">Blog posts on software engineering topics</p>
		</Card>
	</div>
	<div
		class={`m-0 
			gap-2 
			text-white 
			flex 
			flex-row 
			flex-wrap 
			justify-center`}
	>
		<Card on:click={() => (window.location.href = '/github')}>
			<h1 class="text-xl mb-4 leading-none">Github</h1>
			<p class="text-left">Github</p>
		</Card>

		<Card on:click={() => (window.location.href = '/linkedin')}>
			<div class="flex justify-center content-center items-center gap-3 flex-col h-full w-full">
				<div class="relative isolate hover:text-sky-600 justify-center items-center">
					<LinkedinInBrand aria-label="LinkedIn" class="size-12 w-full" />
					<h1 class="text-xl leading-none py-2 w-full">LinkedIn</h1>
				</div>
			</div>
		</Card>

		<Card on:click={() => (window.location.href = '/email')}>
			<h1 class="text-xl mb-4 leading-none">Email</h1>
			<p class="text-left">Email</p>
		</Card>
	</div>
</div>

<div class="flex justify-center mt-8 gap-8 items-center flex-wrap"></div>
