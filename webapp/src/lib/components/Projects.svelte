<script>
	import Card from '$lib/components/Card.svelte';
	import HoverFadeCard from '$lib/components/HoverFadeCard.svelte';
	import {
		GithubBrands,
		LightbulbSolid,
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
			These are some of my personal projects, tools, code and writings.
		</div>

		<HoverFadeCard>
			{#snippet initial()}
				<div class="flex flex-col grow">
					<div class="flex flex-row">
						<span class="text-xl font-bold leading-none pt-2 grow">Making of fintechnick.com</span>
						<SitemapSolid class="size-10" aria-label="Making of FinTechNick" />
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
				<div class="flex flex-col grow">
					<div class="flex flex-row">
						<span class="text-xl font-bold leading-none pt-2 grow"
							>Machine Learning for Flight Delays</span
						>
						<PlaneDepartureSolid class="size-10 " aria-label="Machine Learning for Flight Delays" />
					</div>
					<p class="grow pt-5">
						A machine learning system that uses United States flight data to predict whether a delay
						is likely for upcoming flights.
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
				<div class="flex flex-col grow">
					<div class="flex flex-row">
						<span class="text-xl font-bold leading-none pt-2 grow">Product Pieces</span>
						<LightbulbSolid class="size-10 " aria-label="Tips and Tricks for Product Management" />
					</div>
					<p class="grow pt-5">
						Pieces of insights, and lessons learned, from my adventures in Product Management.
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
				<div class="flex flex-col grow">
					<div class="flex flex-row">
						<span class="text-xl font-bold leading-none pt-2 grow">My Tools</span>
						<ToolboxSolid class="size-10 " aria-label="Tools" />
					</div>
					<p class="grow pt-5">
						Recommendations on the tools I use as an Engineer, Product Manager and Data Person.
					</p>
				</div>
			{/snippet}
			{#snippet onHover()}
				<div class="flex flex-col items-center grow">
					<span class="text-2xl content-center font-bold grow">Coming Soon!</span>
				</div>
			{/snippet}
		</HoverFadeCard>
		<Card
			onclick={() =>
				window.open('https://github.com/nickbrett1/', '_blank', 'noopener', 'noreferrer')}
		>
			<div class="flex flex-col grow">
				<div class="flex flex-row">
					<span class="text-xl font-bold leading-none pt-2 grow">My Code</span>
					<GithubBrands class="size-10" aria-label="Github" />
				</div>
				<p class="grow pt-5">Here you'll find all of my code. Feel free to embrace and extend.</p>
			</div>
		</Card>
		<Card
			onclick={() =>
				window.open('https://medium.com/the-management-code', '_blank', 'noopener', 'noreferrer')}
		>
			<div class="flex flex-col grow">
				<div class="flex flex-row">
					<span class="text-xl font-bold leading-none pt-2 grow">My Writings</span>
					<PenToSquareRegular class="size-10" aria-label="Blog" />
				</div>
				<p class="grow pt-5">
					A collection of articles focusing on things I've learned as a Software Engineering
					Manager.
				</p>
			</div>
		</Card>
	</div>
</div>
