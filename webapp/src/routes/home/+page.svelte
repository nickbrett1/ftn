<script>
	const data = {
		id: 1,
		owner: 'nick.brett1@gmail.com',
		categories: [
			{
				id: 2,
				name: 'Galactic Unicorn',
				items: [
					{
						id: 3,
						name: 'Passport',
						value: '123456789'
					},
					{
						id: 4,
						name: 'BA Executive Club',
						value: '123456789'
					},
					{
						id: 5,
						name: 'Known Traveler Number',
						value: '123456789'
					},
					{
						id: 6,
						name: 'Jet Blue TrueBlue',
						value: '123456789'
					}
				]
			},
			{
				id: 7,
				name: 'Hyatt Suite Checker',
				items: [
					{
						id: 8,
						name: 'National Insurance Number',
						value: '123456789'
					},
					{
						id: 9,
						name: 'Social Security Number',
						value: '123456789'
					}
				]
			},
			{
				id: 10,
				name: 'Chase Monthly',
				items: [
					{
						id: 11,
						name: 'Two Sigma Dental Group Number',
						value: '123456789'
					}
				]
			},
			{
				id: 12,
				name: 'driftdb'
			},
			{ id: 13, name: 'headless CMS for product ideas', value: 'sanity.io' }
		]
	};
</script>

<div>
	{#each data.categories as category (category.id)}
		<div key={category.id} class="max-w-sm overflow-hidden rounded-sm shadow-lg">
			<div class="px-6 py-4">
				<div class="mb-2 text-xl font-bold text-white">
					{category.name}
				</div>
			</div>
		</div>
	{/each}
</div>
