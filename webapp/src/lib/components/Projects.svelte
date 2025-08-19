<script>
	import Card from '$lib/components/Card.svelte';
	import HoverFadeCard from '$lib/components/HoverFadeCard.svelte';
	import {
		GithubBrands,
		DatabaseSolid,
		PenToSquareRegular,
		ToolboxSolid,
		PlaneDepartureSolid,
		SitemapSolid
	} from 'svelte-awesome-icons';
</script>

<div id="projects" class="section">
	<div class="my-20 text-xl leading-none text-green-400">&rarr; PROJECTS</div>

	<div
		class="grid gap-4 items-stretch auto-rows-fr grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(312px,1fr))] text-white"
	>
		<div class="md:p-6 text-pretty md:text-right text-3xl leading-tight tracking-tight">
			These are some of my personal projects, tools, code and writings.
		</div>

		<Card onclick={() => (window.location.href = '/projects/dbt-duckdb')}>
			<div class="flex flex-col grow">
				<div class="flex flex-row">
					<span class="text-xl font-bold leading-none pt-2 grow"
						>Modern ETL without a Data Warehouse</span
					>
					<DatabaseSolid class="size-10" aria-label="ETL Project" />
				</div>
				<p class="grow pt-5">
					A project using DuckDB and dbt to build a flexible, low-cost and manageable ETL solution
					without a Data Warehouse.
				</p>
			</div>
		</Card>
		<Card onclick={() => (window.location = 'https://github.com/nickbrett1/data-science-on-gcp/')}>
			<div class="flex flex-col grow">
				<div class="flex flex-row">
					<span class="text-xl font-bold leading-none pt-2 grow"
						>Machine Learning for Flight Delays</span
					>
					<PlaneDepartureSolid class="size-10 " aria-label="Machine Learning for Flight Delays" />
				</div>
				<p class="grow pt-5">
					A machine learning system from work by Valliappa Lakshmana that uses USA flight data to
					predict whether a delay is likely for upcoming flights.
				</p>
			</div>
		</Card>
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
		<Card onclick={() => (window.location = 'https://github.com/nickbrett1/')}>
			<div class="flex flex-col grow">
				<div class="flex flex-row">
					<span class="text-xl font-bold leading-none pt-2 grow">My Code</span>
					<GithubBrands class="size-10" aria-label="Github" />
				</div>
				<p class="grow pt-5">Here you'll find all of my code. Feel free to embrace and extend.</p>
			</div>
		</Card>
		<Card onclick={() => (window.location = 'https://medium.com/the-management-code')}>
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
