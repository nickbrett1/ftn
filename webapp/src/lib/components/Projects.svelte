<script>
	import Card from '$lib/components/Card.svelte';
	import HoverFadeCard from '$lib/components/HoverFadeCard.svelte';
	import GlowButton from '$lib/components/GlowButton.svelte';
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
		class="grid gap-4 items-stretch auto-rows-fr grid-cols-[repeat(auto-fill,minmax(312px,1fr))] text-white"
	>
		<div class="md:p-6 text-pretty md:text-right text-3xl leading-tight tracking-tight">
			These are some of my personal projects, tools, code, blog and contact information.
		</div>

		<HoverFadeCard>
			{#snippet initial()}
				<div class="flex flex-col grow">
					<div class="flex flex-row">
						<span class="text-xl font-bold leading-none pt-2 grow">Making of fintechnick.com</span>
						<SitemapSolid class="size-10 " aria-label="Making of FinTechNick" />
					</div>
					<p class="grow pt-5">
						As a 'data person', building a website using modern front-end technologies and patterns
						was a challenge. Here I share my approach and lessons learned.
					</p>
				</div>
			{/snippet}
			{#snippet onHover()}
				<div class="flex flex-col items-center grow">
					<span class="text-2xl content-center font-bold grow">Coming Soon!</span>
				</div>
			{/snippet}
		</HoverFadeCard>
		<HoverFadeCard>
			{#snippet initial()}
				<div class="flex flex-col items-center grow">
					<PlaneDepartureSolid
						aria-label="Machine Learning for Flight Delays"
						class="size-20 grow"
					/>
					<span class="text-xl leading-none text-center pt-2 grow">
						Machine Learning for Flight Delays
					</span>
				</div>
			{/snippet}
			{#snippet onHover()}
				<div class="flex flex-col items-center grow">
					<span class="text-2xl content-center font-bold grow">Coming Soon!</span>
				</div>
			{/snippet}
		</HoverFadeCard>
		<HoverFadeCard>
			{#snippet initial()}
				<div class="flex flex-col items-center grow">
					<ToolboxSolid aria-label="Tools" class="size-20 grow" />
					<span class="text-xl leading-none content-center pt-2 grow">My Tools</span>
				</div>
			{/snippet}
			{#snippet onHover()}
				<div class="flex flex-col items-center grow">
					<span class="text-2xl content-center font-bold grow">Coming Soon!</span>
				</div>
			{/snippet}
		</HoverFadeCard>
		<HoverFadeCard
			onclick={() =>
				window.open('https://github.com/nickbrett1/', '_blank', 'noopener', 'noreferrer')}
		>
			{#snippet initial()}
				<div class="flex flex-col items-center grow">
					<GithubBrands aria-label="Github" class="size-20 grow" />
					<span class="text-xl leading-none content-center pt-2 grow">Github</span>
				</div>
			{/snippet}
			{#snippet onHover()}
				<div class="flex flex-col items-center grow">
					<FileCodeRegular aria-label="Github" class="size-20 grow" />
					<span class="text-xl leading-none content-center pt-2 grow">Github</span>
				</div>
			{/snippet}
		</HoverFadeCard>
		<Card
			onclick={() =>
				window.open('https://medium.com/the-management-code', '_blank', 'noopener', 'noreferrer')}
		>
			<div class="flex flex-col items-center grow">
				<PenToSquareRegular aria-label="Blog" class="size-20 grow" />
				<span class="text-xl leading-none content-center pt-2 grow">Blog</span>
			</div>
		</Card>
		<Card
			onclick={() =>
				window.open('https://www.linkedin.com/in/nick-brett/', '_blank', 'noopener', 'noreferrer')}
		>
			<div class="flex flex-col items-center grow hover:text-sky-600">
				<LinkedinInBrands aria-label="LinkedIn" class="size-20 grow" />
				<span class="text-xl leading-none content-center pt-2 grow">LinkedIn</span>
			</div>
		</Card>

		<HoverFadeCard
			onclick={() => window.open('mailto:nick@fintechnick.com', '_blank', 'noopener', 'noreferrer')}
		>
			{#snippet initial()}
				<div class="flex flex-col items-center grow">
					<EnvelopeRegular aria-label="Email" class="size-20 grow" />
					<span class="text-xl leading-none content-center pt-2 grow">Email</span>
				</div>
			{/snippet}
			{#snippet onHover()}
				<div class="flex flex-col items-center grow">
					<EnvelopeOpenRegular aria-label="Email" class="size-20 grow" />
					<span class="text-xl leading-none content-center pt-2 grow">Email</span>
				</div>
			{/snippet}
		</HoverFadeCard>
	</div>
</div>
