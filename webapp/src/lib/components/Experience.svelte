<script>
	import Milestone from '$lib/components/Milestone.svelte';

	const work = [
		{
			from: 'Feb 2025',
			to: 'Present',
			title: 'Senior Vice President: Strategic Initatives',
			workplace: 'Data Engineering @ Two Sigma',
			body: [
				"I'm currently focused on various strategic initiatives across the Two Sigma Data Engineering department.",
				'This includes work to build systems that can provide full reproducibility of data over time, new data storage architectures to unlock research opportunities and driving complex external partnerships.',
				'This work combines a mix of deep technical data expertise, strong product-sense and an ability to collaborate widely across the organization.'
			],
			keywords: [],
			icons: []
		},
		{
			from: 'Dec 2023',
			to: 'Feb 2025',
			title: 'Head of Data Platform & Differentiated Data Engineering',
			workplace: 'Data Engineering @ Two Sigma',
			body: [
				'Expanded scope to lead a second seperate cross-functional team "Differentiated Data Engineering" of Data Engineers, Data Scientists and Program Managers.',
				"The team built and leveraged LLM technology to create differentiated proprietary datasets. Responsibilities encompassed three efforts; building tools that leverage LLM technology that can be used to deliver new sources of alpha, establishing systems and processes that allow the scalable validation and tuning of LLM's with human input, and building datasets with the team's LLM tools that themselves deliver alpha."
			],
			keywords: [],
			icons: []
		},
		{
			from: 'Jan 2023',
			to: 'Dec 2023',
			title: 'Head of Data Platform',
			workplace: 'Data Engineering @ Two Sigma',
			body: [
				"Led a team of Data Engineers responsible for Two Sigma's Data Platform, a suite of tools and services that enable Alpha Modelers and other internal customers to discover, share and seamlessly use Two Sigma's vast catalog of vendor supplied, proprietary and derived datasets. Key products include a 'Feature Catalog', that organizes, indexes and permissions economically valuable time-series data (features) in a highly secure environment, and a data lineage system for tracing all data flows across Two Sigma.",
				'Key achievements included establishing a process and mechanism to provide data lineage insights that delivered use-cases around risk management, support cost reduction and model attribution in a way that did not disrupt modeler workflow or require a rebuild of the existing architecture. Also developing systems to allow data upgrades to occur seamlessly, with alpha models migrated to new data sets with no disruption and minimal effort.'
			]
		}
	];
</script>

<div>
	<div class="mb-20 text-xl leading-none text-green-400">&rarr; EXPERIENCE</div>

	<p
		class="mb-12 text-pretty pr-24 text-2xl leading-tight tracking-tight text-white md:text-3xl lg:w-1/2"
	>
		Where I've worked, what I've built, and the impact I've had.
	</p>
	<div
		class="relative
			space-y-12
			pb-4
			sm:pt-8
			sm:before:absolute
			sm:before:inset-0
			sm:before:left-[1px]
			sm:before:h-full
			sm:before:w-[1px]
			sm:before:-translate-x-px
			sm:before:bg-gradient-to-b
			sm:before:from-white/25
			sm:before:via-white/25
			sm:before:to-transparent"
	>
		{#each work as w, i}
			<Milestone
				from={w.from}
				to={w.to}
				heading={w.title}
				subheading={w.workplace}
				body={w.body}
				keywords={w.keywords}
				icons={w.icons}
				active={i === 0}
			></Milestone>
		{/each}
	</div>
</div>
