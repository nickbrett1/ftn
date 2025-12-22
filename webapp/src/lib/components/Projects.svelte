<script>
	import Card from '$lib/components/Card.svelte';
	import HoverFadeCard from '$lib/components/HoverFadeCard.svelte';
	import {
		GithubBrands,
		DatabaseSolid,
		PenToSquareRegular,
		ToolboxSolid,
		PlaneDepartureSolid,
		RobotSolid,
		ProjectDiagramSolid
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

		<Card onclick={() => (globalThis.location.href = '/projects/building-with-ai')}>
			<div class="flex flex-col grow">
				<div class="flex flex-row">
					<span class="text-xl font-bold leading-none pt-2 grow">Building with AI Agents</span>
					<RobotSolid class="size-10" aria-label="AI Agents Project" />
				</div>
				<p class="grow pt-5">
					10 thoughts on AI-assisted development from building a personal finance tool using
					Cursor's agent mode.
				</p>
			</div>
		</Card>
		<Card onclick={() => (globalThis.location.href = '/projects/data-arch-diagram')}>
			<div class="flex flex-col grow">
				<div class="flex flex-row">
					<span class="text-xl font-bold leading-none pt-2 grow"
						>Gemini 3 Data Architecture Diagram</span
					>
					<ProjectDiagramSolid class="size-10" aria-label="Data Architecture Diagram Project" />
				</div>
				<p class="grow pt-5">
					An experiment testing Gemini 3's multimodal capabilities by asking it to convert a photo
					of a data architecture diagram into interactive code.
				</p>
			</div>
		</Card>
		<Card onclick={() => (globalThis.location.href = '/projects/dbt-duckdb')}>
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
		<Card
			onclick={() => (globalThis.location = 'https://github.com/nickbrett1/data-science-on-gcp/')}
		>
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
		<a href="/projects/genproj" class="flex grow">
			<Card>
				<div class="flex flex-col grow">
					<div class="flex flex-row">
						<span class="text-xl font-bold leading-none pt-2 grow">Generate a Project</span>
						<ToolboxSolid class="size-10 " aria-label="Tools" />
					</div>
					<p class="grow pt-5">
						A tool that generates a new repository with configuration for tools that I find are
						great productivity boosters.
					</p>
				</div>
			</Card>
		</a>
		<Card onclick={() => (globalThis.location = 'https://github.com/nickbrett1/')}>
			<div class="flex flex-col grow">
				<div class="flex flex-row">
					<span class="text-xl font-bold leading-none pt-2 grow">My Code</span>
					<GithubBrands class="size-10" aria-label="Github" />
				</div>
				<p class="grow pt-5">Here you'll find all of my code. Feel free to embrace and extend.</p>
			</div>
		</Card>
		<Card onclick={() => (globalThis.location = 'https://medium.com/the-management-code')}>
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
