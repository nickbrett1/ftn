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
		<div class="md:p-6 text-pretty md:text-right text-2xl md:text-3xl leading-tight tracking-tight">
			These are some of my personal projects, tools, code, blog and contact information.
		</div>

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
