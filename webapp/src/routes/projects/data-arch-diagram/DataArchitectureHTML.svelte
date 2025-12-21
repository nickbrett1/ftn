<script>
	import { fly } from 'svelte/transition';

	let selectedItem = null;

	const data = {
		governance: {
			title: 'Data Governance',
			description:
				'A centralized framework to ensure data is managed consistently and meets organizational standards for quality, security, and compliance.',
			icon: 'M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3' // Shield
		},
		sources: [
			{
				id: 'streaming',
				title: 'Streaming',
				description:
					'Real-time data from sources like market feeds, transaction logs, and IoT devices.',
				icon: 'M13 10V3L4 14h7v7l9-11h-7z' // Lightning
			},
			{
				id: 'batch',
				title: 'Batch',
				description: 'Data collected and processed in bulk at regular intervals.',
				icon: 'M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4m0 5c0 2.21-3.58 4-8 4s-8-1.79-8-4' // Database stack / drums
			}
		],
		collect: {
			title: 'Collect & Transform',
			items: [
				{
					id: 'collect',
					title: 'CDC | ETL | Event Streaming',
					description: 'Methods for collecting and transforming data from various sources.',
					examples: 'Kafka, Debezium, Flink, Spark Streaming',
					links: [
						{
							text: 'Modern ETL without a Data Warehouse',
							url: '/projects/dbt-duckdb',
							type: 'project',
							description:
								'See how I implemented this pattern using dbt and DuckDB in this portfolio project.'
						}
					],
					icon: 'M3 6l7 7v4h4v-4l7-7V4H3z' // Funnel/Filter
				}
			]
		},
		store: {
			datalake: {
				title: 'Data Lake',
				description:
					'A central repository for storing large amounts of raw data in its native format.',
				examples: 'S3, ADLS, GCS',
				links: [
					{
						text: 'What is a Data Lake?',
						url: 'https://aws.amazon.com/what-is/data-lake/',
						type: 'info',
						description: 'Learn more about the Data Lake concept from AWS.'
					}
				],
				stages: [
					{
						id: 'raw',
						title: 'Raw / Landing',
						description:
							'The first stage in the data lake, holding raw data in its original format.'
					},
					{
						id: 'staging',
						title: 'Staging / Silver',
						description: 'Intermediate storage where data is cleaned, transformed, and enriched.'
					},
					{
						id: 'production',
						title: 'Production / Gold',
						description:
							'The final, curated layer of the data lake, providing high-quality, analysis-ready data.'
					},
					{
						id: 'sensitive',
						title: 'Sensitive',
						description:
							'A secure area for handling sensitive data, using technologies like Iceberg, Hudi, Delta Lake, or HDFS.',
						examples: 'Iceberg, Hudi, Delta Lake'
					}
				]
			},
			dwh: {
				title: 'Data Warehouse',
				description:
					'A system used for reporting and data analysis, storing structured and processed data.',
				examples: 'Snowflake, BigQuery, Redshift',
				links: [
					{
						text: 'What is a Data Warehouse?',
						url: 'https://www.snowflake.com/en/fundamentals/data-warehouse/',
						type: 'info',
						description: 'A comprehensive guide to Data Warehousing from Snowflake.'
					}
				],
				storage: [
					{ id: 'dwh-raw', title: 'Raw', description: 'Raw data storage layer within the DWH.' },
					{
						id: 'dwh-enriched',
						title: 'Enriched',
						description: 'Enriched data ready for specific business contexts.'
					},
					{
						id: 'dwh-curated',
						title: 'Curated',
						description: 'Highly governed data for official reporting.'
					}
				],
				engine: {
					title: 'Analytical Engine',
					items: ['SQL', 'AI/ML', 'Streaming'],
					description: 'Powers querying and analysis across the warehouse.',
					examples: 'Trino, Spark SQL',
					icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z' // Cog
				},
				programming: {
					title: 'Programming',
					description:
						'Allows for custom data processing and analysis using languages like Python or Scala.',
					examples: 'Snowpark, PySpark'
				}
			}
		},
		analyze: [
			{
				id: 'apps',
				title: 'Applications',
				description: 'Custom applications that consume data via APIs or direct connections.',
				examples: 'Custom React Apps, Microservices, API Consumers',
				links: [
					{
						text: 'Machine Learning for Flight Delays',
						url: 'https://github.com/nickbrett1/data-science-on-gcp/',
						type: 'project',
						description: 'An example application I built that consumes processed data.'
					}
				],
				icon: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z' // App Grid
			},
			{
				id: 'bi',
				title: 'BI / Reporting',
				description: 'Business intelligence tools for dashboards and visual reporting.',
				examples: 'Tableau, PowerBI, Looker, Superset',
				icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2v-3h2v3zm4 0h-2v-5h2v5z' // Chart
			},
			{
				id: 'sql',
				title: 'SQL Clients',
				description: 'Tools for analysts to query data directly using SQL.',
				icon: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M8 10l3 3-3 3 M14 15h3' // Terminal
			},
			{
				id: 'notebooks',
				title: 'Notebooks',
				description: 'Interactive environments (like Jupyter) for data science and exploration.',
				examples: 'Jupyter, Zeppelin, Databricks Notebooks',
				icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' // Doc
			}
		],
		users: [
			{
				id: 'business',
				title: 'Business Users',
				description: 'Consumers relying on reports and dashboards for decision making.',
				icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' // User
			},
			{
				id: 'analysts',
				title: 'Data Analysts',
				description: 'Users who query data to find trends and answer business questions.',
				icon: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.59-6.59L22 11.5V6h-6z' // Trending Up
			},
			{
				id: 'scientists',
				title: 'Data Scientists',
				description: 'Advanced users building models and performing deep statistical analysis.',
				icon: 'M19.8 18.4L14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L4.2 18.4c-.49.66-.02 1.6.8 1.6h14c.82 0 1.29-.94.8-1.6z' // Science
			}
		]
	};

	function select(item) {
		selectedItem = selectedItem === item ? null : item;
	}

	function hasProjectLink(item) {
		return item.links?.some(link => link.type === 'project');
	}
</script>

{#snippet animatedArrow()}
	<svg
		class="w-6 h-12 text-emerald-500/50"
		viewBox="0 0 24 48"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M12 0V40" stroke="currentColor" stroke-width="2" class="animate-dash" />
		<path
			d="M6 34L12 40L18 34"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
{/snippet}

{#snippet icon(path, classes = 'mb-2')}
	<svg
		class="w-6 h-6 mx-auto text-emerald-400 {classes}"
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
	>
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={path} />
	</svg>
{/snippet}

{#snippet projectIndicator()}
	<div class="absolute top-2 right-2 text-purple-400" title="Contains Project Example">
		<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
		</svg>
	</div>
{/snippet}

<div class="w-full p-4 md:p-8 bg-zinc-900 text-zinc-200 font-sans">
	<div class="grid grid-cols-1 2xl:grid-cols-12 gap-6 relative">
		<!-- Sidebar: Governance -->
		<div class="2xl:col-span-1 flex flex-col">
			<button
				class="w-full h-full min-h-[60px] bg-zinc-800 border-2 border-emerald-500/50 rounded-lg p-2 hover:bg-zinc-700 transition-colors cursor-pointer flex items-center justify-center gap-4 2xl:[writing-mode:vertical-lr]"
				on:click={() => select(data.governance)}
				class:ring-2={selectedItem === data.governance}
				class:ring-emerald-400={selectedItem === data.governance}
			>
				<span class="2xl:mb-0 flex-shrink-0 2xl:rotate-180">
					{@render icon(data.governance.icon, '')}
				</span>
				<span class="font-bold text-emerald-100 uppercase tracking-widest text-sm 2xl:rotate-180"
					>Data Governance</span
				>
			</button>
		</div>

		<!-- Main Flow -->
		<div class="2xl:col-span-11 flex flex-col">
			<!-- Section: Sources -->
			<div>
				<h3 class="text-sm font-bold text-amber-100 uppercase mb-4 text-center 2xl:text-left">
					Sources
				</h3>
				<div class="flex flex-col sm:flex-row justify-center 2xl:justify-start gap-4">
					{#each data.sources as source}
						<button
							class="flex-1 p-4 bg-zinc-800 border border-emerald-500/30 rounded-lg hover:bg-zinc-700 transition-all text-center relative"
							on:click={() => select(source)}
							class:ring-2={selectedItem === source}
							class:ring-emerald-400={selectedItem === source}
						>
							{#if hasProjectLink(source)}
								{@render projectIndicator()}
							{/if}
							<div class="font-bold mb-1">{source.title}</div>
							{@render icon(source.icon)}
						</button>
					{/each}
				</div>
			</div>

			<!-- Connector Down -->
			<div class="flex justify-center py-4">
				{@render animatedArrow()}
			</div>

			<!-- Section: Collect -->
			<div>
				<h3 class="text-sm font-bold text-amber-100 uppercase mb-4 text-center 2xl:text-left">
					Collect & Transform
				</h3>
				<div class="flex justify-center 2xl:justify-start">
					{#each data.collect.items as item}
						<button
							class="w-full p-4 bg-zinc-800 border border-emerald-500/30 rounded-lg hover:bg-zinc-700 transition-all text-center relative"
							on:click={() => select(item)}
							class:ring-2={selectedItem === item}
							class:ring-emerald-400={selectedItem === item}
						>
							{#if hasProjectLink(item)}
								{@render projectIndicator()}
							{/if}
							<div class="font-bold mb-1">{item.title}</div>
							{@render icon(item.icon)}
						</button>
					{/each}
				</div>
			</div>

			<!-- Connector Down -->
			<div class="flex justify-center py-4">
				{@render animatedArrow()}
			</div>

			<!-- Section: Store -->
			<div>
				<h3 class="text-sm font-bold text-amber-100 uppercase mb-4 text-center 2xl:text-left">
					Store
				</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Data Lake -->
					<div
						class="p-4 rounded-xl border border-dashed border-zinc-600 bg-zinc-800/30 cursor-pointer hover:bg-zinc-800/50 transition-colors relative"
						role="button"
						tabindex="0"
						on:click={() => select(data.store.datalake)}
						on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && select(data.store.datalake)}
						class:ring-2={selectedItem === data.store.datalake}
						class:ring-emerald-400={selectedItem === data.store.datalake}
					>
						{#if hasProjectLink(data.store.datalake)}
							{@render projectIndicator()}
						{/if}
						<div class="text-center font-bold text-zinc-400 mb-4 uppercase tracking-wider">
							{data.store.datalake.title}
						</div>
						<div class="flex flex-col gap-3">
							<div class="flex gap-3">
								<button
									class="w-1/3 p-2 bg-zinc-800 border border-emerald-500/30 rounded hover:bg-zinc-700 text-xs font-bold break-words"
									on:click={(e) => {
										e.stopPropagation();
										select(data.store.datalake.stages[3]);
									}}
								>
									Sensitive
								</button>
								<div class="flex-1 flex flex-col gap-1">
									{#each data.store.datalake.stages.slice(0, 3) as stage, i}
										{#if i > 0}
											<div class="flex justify-center -my-1 text-emerald-500/30 z-0">
												<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m0 0l-3-3m3 3l3-3" />
												</svg>
											</div>
										{/if}
										<button
											class="p-2 bg-zinc-800 border border-emerald-500/30 rounded hover:bg-zinc-700 text-sm font-medium z-10 relative"
											on:click={(e) => {
												e.stopPropagation();
												select(stage);
											}}
											class:ring-2={selectedItem === stage}
											class:ring-emerald-400={selectedItem === stage}
										>
											{stage.title}
										</button>
									{/each}
								</div>
							</div>
						</div>
					</div>

					<!-- DWH -->
					<div
						class="p-4 rounded-xl border border-dashed border-zinc-600 bg-zinc-800/30 cursor-pointer hover:bg-zinc-800/50 transition-colors relative"
						role="button"
						tabindex="0"
						on:click={() => select(data.store.dwh)}
						on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && select(data.store.dwh)}
						class:ring-2={selectedItem === data.store.dwh}
						class:ring-emerald-400={selectedItem === data.store.dwh}
					>
						{#if hasProjectLink(data.store.dwh)}
							{@render projectIndicator()}
						{/if}
						<div class="text-center font-bold text-zinc-400 mb-4 uppercase tracking-wider">
							{data.store.dwh.title}
						</div>

						<div class="flex items-center gap-1 mb-4">
							{#each data.store.dwh.storage as layer, i}
								{#if i > 0}
									<svg class="w-4 h-4 text-emerald-500/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
									</svg>
								{/if}
								<button
									class="flex-1 p-2 bg-zinc-800 border border-emerald-500/30 rounded hover:bg-zinc-700 text-xs font-bold text-center flex items-center justify-center h-full min-h-[40px]"
									on:click={(e) => {
										e.stopPropagation();
										select(layer);
									}}
									class:ring-2={selectedItem === layer}
									class:ring-emerald-400={selectedItem === layer}
								>
									{layer.title}
								</button>
							{/each}
						</div>

						<div class="flex gap-2">
							<button
								class="w-2/3 p-3 bg-zinc-900 rounded border border-zinc-700 hover:bg-zinc-800 transition-colors text-left"
								on:click={(e) => {
									e.stopPropagation();
									select(data.store.dwh.engine);
								}}
								class:ring-2={selectedItem === data.store.dwh.engine}
								class:ring-emerald-400={selectedItem === data.store.dwh.engine}
							>
								<div class="text-xs text-zinc-500 uppercase mb-2 text-center">
									Analytical Engine
								</div>
								<div class="flex flex-wrap gap-1 justify-center">
									{#each data.store.dwh.engine.items as engItem}
										<span
											class="px-2 py-1 bg-zinc-800 text-xs rounded text-zinc-300 border border-zinc-700"
											>{engItem}</span
										>
									{/each}
								</div>
							</button>
							<button
								class="w-1/3 p-2 bg-zinc-800 border border-emerald-500/30 rounded hover:bg-zinc-700 text-xs font-bold flex items-center justify-center text-center"
								on:click={(e) => {
									e.stopPropagation();
									select(data.store.dwh.programming);
								}}
								class:ring-2={selectedItem === data.store.dwh.programming}
								class:ring-emerald-400={selectedItem === data.store.dwh.programming}
							>
								Code / Prog
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Connector Down -->
			<div class="flex justify-center py-4">
				{@render animatedArrow()}
			</div>

			<!-- Section: Analyze -->
			<div>
				<h3 class="text-sm font-bold text-amber-100 uppercase mb-4 text-center 2xl:text-left">
					Analyze, Visualize, Activate
				</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					{#each data.analyze as item}
						<button
							class="p-4 bg-zinc-800 border border-emerald-500/30 rounded-lg hover:bg-zinc-700 transition-all text-center flex flex-col items-center justify-center min-h-[80px] relative"
							on:click={() => select(item)}
							class:ring-2={selectedItem === item}
							class:ring-emerald-400={selectedItem === item}
						>
							{#if hasProjectLink(item)}
								{@render projectIndicator()}
							{/if}
							<span class="font-bold text-sm mb-2">{item.title}</span>
							{@render icon(item.icon)}
						</button>
					{/each}
				</div>
			</div>

			<!-- Connector Down (Between Grid and End Users) -->
			<div class="flex justify-center py-6">
				{@render animatedArrow()}
			</div>

			<!-- Section: End Users -->
			<div>
				<h3 class="text-sm font-bold text-amber-100 uppercase mb-4 text-center 2xl:text-left">
					End Users
				</h3>
				<div class="flex flex-col sm:flex-row gap-4 justify-center 2xl:justify-start">
					{#each data.users as user}
						<button
							class="flex-1 p-4 bg-zinc-800 border border-emerald-500/30 rounded-lg hover:bg-zinc-700 transition-all text-center relative"
							on:click={() => select(user)}
							class:ring-2={selectedItem === user}
							class:ring-emerald-400={selectedItem === user}
						>
							{#if hasProjectLink(user)}
								{@render projectIndicator()}
							{/if}
							<div class="font-bold mb-1">{user.title}</div>
							{@render icon(user.icon)}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Info Panel (Sticky bottom or Modal) -->
	{#if selectedItem}
		<div
			transition:fly={{ y: 50, duration: 300 }}
			class="fixed bottom-0 left-0 right-0 p-6 bg-zinc-900/95 backdrop-blur-md border-t border-emerald-500/50 shadow-2xl z-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
		>
			<div class="flex-1">
				<h4 class="text-lg font-bold text-emerald-400 mb-1">{selectedItem.title}</h4>
				<p class="text-zinc-300 text-sm md:text-base">{selectedItem.description}</p>

				{#if selectedItem.examples}
					<div class="mt-2 text-sm text-zinc-400">
						<span class="font-bold text-zinc-500 uppercase text-xs">Examples:</span>
						{selectedItem.examples}
					</div>
				{/if}

				{#if selectedItem.links && selectedItem.links.length > 0}
					<div class="mt-4 flex flex-col gap-3">
						<div class="text-xs font-bold text-zinc-500 uppercase">Related Content</div>
						{#each selectedItem.links as link}
							<div class="flex flex-col gap-1">
								<div class="flex items-center gap-2">
									{#if link.type === 'project'}
										<span
											class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase border border-emerald-500/30"
											>My Project</span
										>
									{:else}
										<span
											class="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase border border-blue-500/30"
											>Reference</span
										>
									{/if}
									<a
										href={link.url}
										target="_blank"
										rel="noopener noreferrer"
										class="text-emerald-400 hover:text-emerald-300 underline text-sm flex items-center gap-1 group"
									>
										{link.text}
										<svg
											class="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
											/>
										</svg>
									</a>
								</div>
								{#if link.description}
									<p class="text-xs text-zinc-400 pl-2 border-l-2 border-zinc-700 ml-1">
										{link.description}
									</p>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
			<button
				class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded border border-zinc-600 shrink-0"
				on:click={() => (selectedItem = null)}
			>
				Close
			</button>
		</div>
	{/if}
</div>

<style>
	@keyframes dash {
		to {
			stroke-dashoffset: 0;
		}
	}
	/* Use :global to ensure the animation works if styles are scoped, though these classes are applied to the SVG */
	.animate-dash {
		stroke-dasharray: 5;
		stroke-dashoffset: 10;
		animation: dash 1s linear infinite;
	}
</style>
