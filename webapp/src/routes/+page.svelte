<script>
	import Header from '$lib/components/Header.svelte';
	import Background from '$lib/components/Background.svelte';
	import Landing from '$lib/components/Landing.svelte';
	import Card from '$lib/components/Card.svelte';
	import HoverFadeCard from '$lib/components/HoverFadeCard.svelte';
	import LinkedinInBrand from 'svelte-awesome-icons/LinkedinInBrand.svelte';
	import EnvelopeRegular from 'svelte-awesome-icons/EnvelopeRegular.svelte';
	import EnvelopeOpenRegular from 'svelte-awesome-icons/EnvelopeOpenRegular.svelte';
	import GithubBrand from 'svelte-awesome-icons/GithubBrand.svelte';
	import FileCodeRegular from 'svelte-awesome-icons/FileCodeRegular.svelte';
	import PenToSquareRegular from 'svelte-awesome-icons/PenToSquareRegular.svelte';
	import ToolboxSolid from 'svelte-awesome-icons/ToolboxSolid.svelte';
	import PlaneDepartureSolid from 'svelte-awesome-icons/PlaneDepartureSolid.svelte';
	import SitemapSolid from 'svelte-awesome-icons/SitemapSolid.svelte';
	import IntroButton from '../lib/components/IntroButton.svelte';

	function getScrollPercent() {
		let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
		let scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
		let clientHeight = document.documentElement.clientHeight;

		return scrollTop / (scrollHeight - clientHeight);
	}
	let percentageScroll = 0;
</script>

<svelte:window
	on:scroll={() => {
		percentageScroll = getScrollPercent();
		console.log('percentageScroll:', percentageScroll);
	}}
/>

<Background />

<div class="flex flex-col grow h-dvh min-h-max overflow-visible">
	<Header />
	<Landing />
</div>

<!-- 
<div
	class=" text-white px-8 py-5 text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-black"
>
	Let Me Introduce Myself
</div>
-->

<!-- Can we do a click event here, that animates to a nice full-screen ?? 
 	https://codepen.io/sashatran/pen/KaLqKR -->
<!-- Reveal cards about my experience in different places, perhaps with company logos -->
<!-- And reveal underneath the links to different sections -->

<!-- Can we add fluid text effect to this - some nice green and red flow background?
 https://flo-bit.dev/projects/fluid-text-effect/ -->

<!-- 
<div class="flex flex-col justify-center items-center grow min-h-dvh">
	<div
		scroll-btween="intro"
		data-opacity="|0:0 to 50:1 to 100:1|"
		class=" text-white opacity-0 z-10 px-8 py-5 max-w-4xl text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-10xl font-black text-center"
	>
		<IntroButton />
	</div>
</div>
-->

<!-- 
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
		<HoverFadeCard>
			<div slot="initial">
				<SitemapSolid aria-label="Making of FinTechNick" class="size-20 w-full" />
				<h1 class="text-xl leading-none py-2 w-full">Making of FinTechNick</h1>
			</div>
			<div slot="onHover">
				<h1 class="text-2xl font-bold">Coming Soon!</h1>
			</div>
		</HoverFadeCard>
		<HoverFadeCard>
			<div slot="initial">
				<PlaneDepartureSolid
					aria-label="Machine Learning for Flight Delays"
					class="size-20 w-full"
				/>
				<h1 class="text-xl leading-none py-2 w-full">Machine Learning for Flight Delays</h1>
			</div>
			<div slot="onHover">
				<h1 class="text-2xl font-bold">Coming Soon!</h1>
			</div>
		</HoverFadeCard>
		<HoverFadeCard>
			<div slot="initial">
				<ToolboxSolid aria-label="Tools" class="size-20 w-full" />
				<h1 class="text-xl leading-none py-2 w-full">My Tools</h1>
			</div>
			<div slot="onHover">
				<h1 class="text-2xl font-bold">Coming Soon!</h1>
			</div>
		</HoverFadeCard>
		<Card
			on:click={() =>
				window.open('https://medium.com/the-management-code', '_blank', 'noopener', 'noreferrer')}
		>
			<PenToSquareRegular aria-label="Blog" class="size-20 w-full" />
			<h1 class="text-xl leading-none py-2 w-full">Blog</h1>
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
		<HoverFadeCard
			on:click={() =>
				window.open('https://github.com/nickbrett1/', '_blank', 'noopener', 'noreferrer')}
		>
			<div slot="initial">
				<GithubBrand aria-label="Github" class="size-20 w-full" />
				<h1 class="text-xl leading-none py-2 w-full">Github</h1>
			</div>
			<div slot="onHover">
				<FileCodeRegular aria-label="Github" class="size-20 w-full" />
				<h1 class="text-xl leading-none py-2 w-full">Github</h1>
			</div>
		</HoverFadeCard>
		<Card
			on:click={() =>
				window.open('https://www.linkedin.com/in/nick-brett/', '_blank', 'noopener', 'noreferrer')}
		>
			<div class="flex justify-center content-center items-center gap-3 flex-col h-full w-full">
				<div class="relative isolate hover:text-sky-600 justify-center items-center">
					<LinkedinInBrand aria-label="LinkedIn" class="size-20 w-full" />
					<h1 class="text-xl leading-none py-2 w-full">LinkedIn</h1>
				</div>
			</div>
		</Card>

		<HoverFadeCard
			on:click={() =>
				window.open('mailto:nick@fintechnick.com', '_blank', 'noopener', 'noreferrer')}
		>
			<div slot="initial">
				<EnvelopeRegular aria-label="Email" class="size-20 w-full" />
				<h1 class="text-xl leading-none py-2 w-full">Email</h1>
			</div>
			<div slot="onHover">
				<EnvelopeOpenRegular aria-label="Email" class="size-20 w-full" />
				<h1 class="text-xl leading-none py-2 w-full">Email</h1>
			</div>
		</HoverFadeCard>
	</div>
</div>

<div class="flex justify-center mt-8 gap-8 items-center flex-wrap"></div>
-->
