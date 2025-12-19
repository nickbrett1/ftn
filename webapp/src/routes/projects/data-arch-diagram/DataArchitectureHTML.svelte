<script>
	import { fly } from 'svelte/transition';

	let selectedItem = null;

	const data = {
		governance: {
			title: 'Data Governance',
			description:
				'A centralized framework to ensure data is managed consistently and meets organizational standards for quality, security, and compliance.'
		},
		sources: [
			{
				id: 'streaming',
				title: 'Streaming',
				description: 'Real-time data from sources like IoT devices, applications, and social media.'
			},
			{
				id: 'batch',
				title: 'Batch',
				description: 'Data collected and processed in bulk at regular intervals.'
			}
		],
		collect: {
			title: 'Collect & Transform',
			items: [
				{
					id: 'collect',
					title: 'CDC | ETL | Event Streaming',
					description: 'Methods for collecting and transforming data from various sources.'
				}
			]
		},
		store: {
			datalake: {
				title: 'Data Lake',
				description:
					'A central repository for storing large amounts of raw data in its native format.',
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
							'A secure area for handling sensitive data, using technologies like Iceberg, Hudi, Delta Lake, or HDFS.'
					}
				]
			},
			dwh: {
				title: 'Data Warehouse',
				description:
					'A system used for reporting and data analysis, storing structured and processed data.',
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
					description: 'Powers querying and analysis across the warehouse.'
				},
				programming: {
					title: 'Programming',
					description:
						'Allows for custom data processing and analysis using languages like Python or Scala.'
				}
			}
		},
		analyze: [
			{
				id: 'apps',
				title: 'Applications',
				description: 'Custom applications that consume data via APIs or direct connections.'
			},
			{
				id: 'bi',
				title: 'BI / Reporting',
				description: 'Business intelligence tools for dashboards and visual reporting.'
			},
			{
				id: 'sql',
				title: 'SQL Clients',
				description: 'Tools for analysts to query data directly using SQL.'
			},
			{
				id: 'notebooks',
				title: 'Notebooks',
				description: 'Interactive environments (like Jupyter) for data science and exploration.'
			}
		],
		users: [
			{
				id: 'business',
				title: 'Business Users',
				description: 'Consumers relying on reports and dashboards for decision making.'
			},
			{
				id: 'analysts',
				title: 'Data Analysts',
				description: 'Users who query data to find trends and answer business questions.'
			},
			{
				id: 'scientists',
				title: 'Data Scientists',
				description: 'Advanced users building models and performing deep statistical analysis.'
			}
		]
	};

	function select(item) {
		selectedItem = selectedItem === item ? null : item;
	}
</script>

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

{#snippet animatedArrow()}
	<svg
		class="w-6 h-12 mx-auto text-emerald-500/50"
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

{#snippet iconStreaming()}
	<svg
		class="w-6 h-6 mx-auto mb-2 text-emerald-400"
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M13 10V3L4 14h7v7l9-11h-7z"
		/>
	</svg>
{/snippet}

{#snippet iconBatch()}
	<svg
		class="w-6 h-6 mx-auto mb-2 text-emerald-400"
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4m0 5c0 2.21-3.58 4-8 4s-8-1.79-8-4"
		/>
	</svg>
{/snippet}

<div class="w-full max-w-6xl mx-auto p-4 md:p-8 bg-zinc-900 text-zinc-200 font-sans">
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
		<!-- Sidebar: Governance -->
		<div class="lg:col-span-1 flex lg:block">
			<button
				class="w-full h-full min-h-[60px] bg-zinc-800 border-2 border-emerald-500/50 rounded-lg p-2 hover:bg-zinc-700 transition-colors cursor-pointer flex items-center justify-center lg:[writing-mode:vertical-lr]"
				on:click={() => select(data.governance)}
				class:ring-2={selectedItem === data.governance}
				class:ring-emerald-400={selectedItem === data.governance}
			>
				<span class="font-bold text-emerald-100 uppercase tracking-widest text-sm lg:rotate-180"
					>Data Governance</span
				>
			</button>
		</div>

		<!-- Main Flow -->
		<div class="lg:col-span-11 flex flex-col gap-8">
			<!-- Section: Sources -->
			<div class="relative group">
				<h3 class="text-sm font-bold text-amber-100 uppercase mb-4 text-center lg:text-left">
					Sources
				</h3>
				<div class="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
					{#each data.sources as source}
						<button
							class="flex-1 p-4 bg-zinc-800 border border-emerald-500/30 rounded-lg hover:bg-zinc-700 transition-all text-center relative"
							on:click={() => select(source)}
							class:ring-2={selectedItem === source}
							class:ring-emerald-400={selectedItem === source}
						>
							<div class="font-bold mb-1">{source.title}</div>
							{#if source.id === 'streaming'}
								{@render iconStreaming()}
							{:else}
								{@render iconBatch()}
							{/if}
						</button>
					{/each}
				</div>
				<!-- Connector Down -->
				<div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
					{@render animatedArrow()}
				</div>
			</div>

			<!-- Section: Collect -->
			<div class="relative">
				<h3 class="text-sm font-bold text-amber-100 uppercase mb-4 text-center lg:text-left">
					Collect & Transform
				</h3>
				<div class="flex justify-center lg:justify-start">
					{#each data.collect.items as item}
						<button
							class="w-full p-4 bg-zinc-800 border border-emerald-500/30 rounded-lg hover:bg-zinc-700 transition-all text-center"
							on:click={() => select(item)}
							class:ring-2={selectedItem === item}
							class:ring-emerald-400={selectedItem === item}
						>
							<span class="font-bold">{item.title}</span>
						</button>
					{/each}
				</div>
				<!-- Connector Down -->
				<div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
					{@render animatedArrow()}
				</div>
			</div>

			<!-- Section: Store -->
			<div class="relative">
				<h3 class="text-sm font-bold text-amber-100 uppercase mb-4 text-center lg:text-left">
					Store
				</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Data Lake -->
					<div class="p-4 rounded-xl border border-dashed border-zinc-600 bg-zinc-800/30">
						<div class="text-center font-bold text-zinc-400 mb-4 uppercase tracking-wider">
							{data.store.datalake.title}
						</div>
						<div class="flex flex-col gap-3">
							<div class="flex gap-3">
								<button
									class="w-1/3 p-2 bg-zinc-800 border border-emerald-500/30 rounded hover:bg-zinc-700 text-xs font-bold break-words"
									on:click={() => select(data.store.datalake.stages[3])}
								>
									Sensitive
								</button>
								<div class="flex-1 flex flex-col gap-2">
									{#each data.store.datalake.stages.slice(0, 3) as stage}
										<button
											class="p-2 bg-zinc-800 border border-emerald-500/30 rounded hover:bg-zinc-700 text-sm font-medium"
											on:click={() => select(stage)}
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
					<div class="p-4 rounded-xl border border-dashed border-zinc-600 bg-zinc-800/30">
						<div class="text-center font-bold text-zinc-400 mb-4 uppercase tracking-wider">
							{data.store.dwh.title}
						</div>

						<div class="grid grid-cols-3 gap-2 mb-4">
							{#each data.store.dwh.storage as layer}
								<button
									class="p-2 bg-zinc-800 border border-emerald-500/30 rounded hover:bg-zinc-700 text-xs font-bold text-center flex items-center justify-center h-full"
									on:click={() => select(layer)}
									class:ring-2={selectedItem === layer}
									class:ring-emerald-400={selectedItem === layer}
								>
									{layer.title}
								</button>
							{/each}
						</div>

						<div class="flex gap-2">
							<div class="w-2/3 p-3 bg-zinc-900 rounded border border-zinc-700">
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
							</div>
							<button
								class="w-1/3 p-2 bg-zinc-800 border border-emerald-500/30 rounded hover:bg-zinc-700 text-xs font-bold flex items-center justify-center text-center"
								on:click={() => select(data.store.dwh.programming)}
								class:ring-2={selectedItem === data.store.dwh.programming}
								class:ring-emerald-400={selectedItem === data.store.dwh.programming}
							>
								Code / Prog
							</button>
						</div>
					</div>
				</div>

				<!-- Connector Down -->
				<div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
					{@render animatedArrow()}
				</div>
			</div>

			<!-- Section: Analyze -->
			<div class="relative">
				<h3 class="text-sm font-bold text-amber-100 uppercase mb-4 text-center lg:text-left">
					Analyze, Visualize, Activate
				</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					{#each data.analyze as item}
						<button
							class="p-4 bg-zinc-800 border border-emerald-500/30 rounded-lg hover:bg-zinc-700 transition-all text-center flex flex-col items-center justify-center min-h-[80px]"
							on:click={() => select(item)}
							class:ring-2={selectedItem === item}
							class:ring-emerald-400={selectedItem === item}
						>
							<span class="font-bold text-sm">{item.title}</span>
						</button>
					{/each}
				</div>
				<!-- Connector Down -->
				<div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
					{@render animatedArrow()}
				</div>
			</div>

			<!-- Section: End Users -->
			<div>
				<h3 class="text-sm font-bold text-amber-100 uppercase mb-4 text-center lg:text-left">
					End Users
				</h3>
				<div class="flex flex-col sm:flex-row gap-4 justify-center">
					{#each data.users as user}
						<button
							class="flex-1 p-4 bg-zinc-800 border border-emerald-500/30 rounded-lg hover:bg-zinc-700 transition-all text-center"
							on:click={() => select(user)}
							class:ring-2={selectedItem === user}
							class:ring-emerald-400={selectedItem === user}
						>
							<span class="font-bold">{user.title}</span>
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
