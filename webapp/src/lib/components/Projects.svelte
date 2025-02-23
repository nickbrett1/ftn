<script>
	import Card from '$lib/components/Card.svelte';
	import HoverFadeCard from '$lib/components/HoverFadeCard.svelte';
	import {
		LinkedinInBrands,
		EnvelopeRegular,
		EnvelopeOpenRegular,
		GithubBrands,
		FileCodeRegular,
		PenToSquareRegular,
		ToolboxSolid,
		PlaneDepartureSolid,
		SitemapSolid
	} from 'svelte-awesome-icons';
</script>

<div>
	<div class="mb-20 text-xl leading-none text-green-400">&rarr; PROJECTS</div>

	<div
		class="grid gap-12 items-stretch auto-rows-fr grid-cols-[repeat(auto-fill,minmax(312px,1fr))] text-white"
	>
		<div
			class="md:p-6 text-pretty md:text-right text-2xl md:text-3xl font-bold leading-tight tracking-tight"
		>
			These are some of my personal projects, tools, code, blog and contact information.
		</div>
		<!-- Reveal cards about my experience in different places, perhaps with company logos -->
		<!-- And reveal underneath the links to different sections -->

		<!-- Can we add fluid text effect to this - some nice green and red flow background?
 https://flo-bit.dev/projects/fluid-text-effect/ -->

		<!--
	<div class="flex flex-col justify-center items-center grow">
		<div
			scroll-btween="intro"
			data-opacity="|0:0 to 50:1 to 100:1|"
			class=" text-white opacity-0 z-10 px-8 py-5 max-w-4xl text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-10xl font-black text-center"
		>
			<IntroButton />
		</div>
	</div>
	 -->

		<HoverFadeCard>
			{#snippet initial()}
				<SitemapSolid class="size-20 w-full" aria-label="Making of FinTechNick" />
				<h1 class="text-xl leading-none py-2 w-full">Making of FinTechNick</h1>
			{/snippet}
			{#snippet onHover()}
				<h1 class="text-2xl font-bold">Coming Soon!</h1>
			{/snippet}
		</HoverFadeCard>
		<HoverFadeCard>
			{#snippet initial()}
				<PlaneDepartureSolid
					aria-label="Machine Learning for Flight Delays"
					class="size-20 w-full"
				/>
				<h1 class="text-xl leading-none py-2 w-full">Machine Learning for Flight Delays</h1>
			{/snippet}
			{#snippet onHover()}
				<h1 class="text-2xl font-bold">Coming Soon!</h1>
			{/snippet}
		</HoverFadeCard>
		<HoverFadeCard>
			{#snippet initial()}
				<ToolboxSolid aria-label="Tools" class="size-20 w-full" />
				<h1 class="text-xl leading-none py-2 w-full">My Tools</h1>
			{/snippet}
			{#snippet onHover()}
				<h1 class="text-2xl font-bold">Coming Soon!</h1>
			{/snippet}
		</HoverFadeCard>
		<HoverFadeCard
			onclick={() =>
				window.open('https://github.com/nickbrett1/', '_blank', 'noopener', 'noreferrer')}
		>
			{#snippet initial()}
				<div>
					<GithubBrands aria-label="Github" class="size-20 w-full" />
					<h1 class="text-xl leading-none py-2 w-full">Github</h1>
				</div>
			{/snippet}
			{#snippet onHover()}
				<FileCodeRegular aria-label="Github" class="size-20 w-full" />
				<h1 class="text-xl leading-none py-2 w-full">Github</h1>
			{/snippet}
		</HoverFadeCard>
		<Card
			onclick={() =>
				window.open('https://medium.com/the-management-code', '_blank', 'noopener', 'noreferrer')}
		>
			<div class="absolute inset-0 content-center">
				<PenToSquareRegular aria-label="Blog" class="size-20 w-full" />
				<h1 class="text-xl leading-none py-2 w-full">Blog</h1>
			</div>
		</Card>

		<Card
			onclick={() =>
				window.open('https://www.linkedin.com/in/nick-brett/', '_blank', 'noopener', 'noreferrer')}
		>
			<div class="flex justify-center content-center items-center gap-3 flex-col h-full w-full">
				<div class="relative isolate hover:text-sky-600 justify-center items-center">
					<LinkedinInBrands aria-label="LinkedIn" class="size-20 w-full" />
					<h1 class="text-xl leading-none py-2 w-full">LinkedIn</h1>
				</div>
			</div>
		</Card>

		<HoverFadeCard
			onclick={() => window.open('mailto:nick@fintechnick.com', '_blank', 'noopener', 'noreferrer')}
		>
			{#snippet initial()}
				<EnvelopeRegular aria-label="Email" class="size-20 w-full" />
				<h1 class="text-xl leading-none py-2 w-full">Email</h1>
			{/snippet}
			{#snippet onHover()}
				<EnvelopeOpenRegular aria-label="Email" class="size-20 w-full" />
				<h1 class="text-xl leading-none py-2 w-full">Email</h1>
			{/snippet}
		</HoverFadeCard>
	</div>
</div>
