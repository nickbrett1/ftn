<script>
	import { Section, Portfolio, PortfolioItem } from 'flowbite-svelte-blocks';

	const portfolios = [
		{
			customer: 'Alphabet Inc.',
			title: 'Official website',
			description:
				'Flowbite helps you connect with friends, family and communities of people who share your interests.',
			href: '/',
			linkTitle: 'View case study'
		},
		{
			customer: 'Microsoft Corp.',
			title: 'Management system',
			description:
				'Flowbite helps you connect with friends, family and communities of people who share your interests.',
			href: '/',
			linkTitle: 'View case study'
		},
		{
			customer: 'Adobe Inc.',
			title: 'Logo design',
			description:
				'Flowbite helps you connect with friends, family and communities of people who share your interests.',
			href: '/',
			linkTitle: 'View case study'
		}
	];
</script>

<Section name="portfolio">
	<Portfolio
		title="Our work"
		subtitle="Crafted with skill and care to help our clients grow their business!"
		h2Class="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl dark:text-white"
	>
		{#each portfolios as item}
			<PortfolioItem
				titleClass="text-2xl font-bold leading-tight text-white dark:text-white"
				{item}
			/>
		{/each}
	</Portfolio>
</Section>
