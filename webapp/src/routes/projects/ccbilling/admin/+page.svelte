<script>
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Button from '$lib/components/Button.svelte';

	let normalizing = false;
	let results = null;
	let error = null;

	let deduplicating = false;
	let dedupeResults = null;
	let dedupeError = null;
	let dedupePreview = null;

	let consolidating = false;
	let consolidateResults = null;
	let consolidateError = null;
	let consolidatePreview = null;

	async function runNormalization() {
		normalizing = true;
		error = null;
		results = null;

		try {
			const response = await fetch('/api/admin/normalize-merchants', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ offset: 0 })
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			results = await response.json();
		} catch (err) {
			error = err.message;
		} finally {
			normalizing = false;
		}
	}

	async function loadDedupePreview() {
		dedupeError = null;
		dedupePreview = null;

		try {
			const response = await fetch('/api/admin/deduplicate-merchants');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			dedupePreview = await response.json();
		} catch (err) {
			dedupeError = err.message;
		}
	}

	async function runDeduplication() {
		deduplicating = true;
		dedupeError = null;
		dedupeResults = null;

		try {
			const response = await fetch('/api/admin/deduplicate-merchants', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ dryRun: false })
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			dedupeResults = await response.json();
			// Refresh preview after deduplication
			loadDedupePreview();
		} catch (err) {
			dedupeError = err.message;
		} finally {
			deduplicating = false;
		}
	}

	async function loadConsolidatePreview() {
		consolidateError = null;
		consolidatePreview = null;

		try {
			const response = await fetch('/api/admin/consolidate-merchants');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			consolidatePreview = await response.json();
		} catch (err) {
			consolidateError = err.message;
		}
	}

	async function runConsolidation() {
		consolidating = true;
		consolidateError = null;
		consolidateResults = null;

		try {
			const response = await fetch('/api/admin/consolidate-merchants', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ dryRun: false })
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			consolidateResults = await response.json();
			// Refresh preview after consolidation
			loadConsolidatePreview();
		} catch (err) {
			consolidateError = err.message;
		} finally {
			consolidating = false;
		}
	}

	// Load preview on component mount
	import { onMount } from 'svelte';
	onMount(() => {
		loadDedupePreview();
		loadConsolidatePreview();
	});
</script>

<svelte:head>
	<title>Admin Tools - CC Billing</title>
</svelte:head>

<Header />

<main class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-8">
			<h1 class="text-3xl font-bold">Admin Tools</h1>
			<Button href="/projects/ccbilling" variant="secondary" size="lg"
				>Back to Billing Cycles</Button
			>
		</div>

		<!-- Database Normalization Section -->
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
			<h2 class="text-xl font-semibold mb-4">Database Normalization</h2>

			<p class="text-gray-300 mb-6">
				Run the merchant normalization process across all payment records and budget-to-merchant
				auto-association mappings. This will ensure all merchant names are consistently normalized
				and budget assignments stay in sync.
			</p>

			<Button onclick={runNormalization} variant="success" size="lg" disabled={normalizing}>
				{normalizing ? 'Running...' : 'Run Normalization'}
			</Button>

			{#if error}
				<div class="mt-6 p-4 bg-red-900 border border-red-700 rounded-lg">
					<div class="text-red-300">
						❌ Error: {error}
						{#if error.includes('401')}
							<div class="mt-2 text-red-200 text-sm">
								This appears to be an authentication error. You may need to log in again.
							</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if results}
				<div class="mt-6 p-4 bg-green-900 border border-green-700 rounded-lg">
					<div class="text-green-300">✅ Normalization completed successfully!</div>
					<div class="mt-3 text-sm text-green-200">
						<div>Payments updated: {results.paymentsUpdated}</div>
						<div>
							Budget to merchant auto-association mappings updated: {results.budgetMerchantsUpdated ||
								0}
						</div>
						{#if results.errors && results.errors.length > 0}
							<div class="mt-2 text-yellow-200">
								<div class="font-medium mb-2">⚠️ Warnings: {results.errors.length} issues encountered</div>
								<div class="text-sm space-y-2 max-h-40 overflow-y-auto">
									{#each results.errors as error}
										<div class="bg-yellow-900/30 border border-yellow-700 rounded p-2">
											{#if error.type}
												<div class="font-medium text-yellow-300">{error.type}</div>
											{/if}
											{#if error.merchant}
												<div class="text-yellow-200">Merchant: {error.merchant}</div>
											{/if}
											{#if error.id}
												<div class="text-yellow-200">ID: {error.id}</div>
											{/if}
											<div class="text-yellow-100 text-xs mt-1">{error.error}</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Merchant Deduplication Section -->
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-8">
			<h2 class="text-xl font-semibold mb-4">Merchant Deduplication</h2>

			<p class="text-gray-300 mb-6">
				Find and merge merchants that are identical except for case differences (e.g., "AMAZON" and
				"amazon"). This ensures consistent merchant names throughout the system.
			</p>

			{#if dedupePreview}
				<div class="mb-6 p-4 bg-gray-700 border border-gray-600 rounded-lg">
					<h3 class="text-lg font-medium mb-3">Duplicate Analysis</h3>

					{#if dedupePreview.duplicatesFound === 0}
						<div class="text-green-300">
							✅ No case-only duplicate merchants found! Your merchant data is clean.
						</div>
					{:else}
						<div class="text-yellow-300 mb-4">
							⚠️ Found {dedupePreview.duplicatesFound} groups of duplicate merchants affecting:
							<ul class="list-disc list-inside mt-2 text-sm">
								<li>{dedupePreview.totalPaymentsAffected} payment records</li>
								<li>{dedupePreview.totalBudgetMerchantsAffected} budget assignments</li>
							</ul>
						</div>

						{#if dedupePreview.duplicates && dedupePreview.duplicates.length > 0}
							<div class="text-sm">
								<h4 class="font-medium mb-2">Examples of duplicates (showing first 5):</h4>
								{#each dedupePreview.duplicates.slice(0, 5) as duplicate}
									<div class="mb-2 p-2 bg-gray-600 rounded">
										<div class="font-medium text-blue-300">{duplicate.canonicalForm}</div>
										<div class="text-xs text-gray-300">
											Will merge: {duplicate.variants.map((v) => v.variant).join(', ')}
											→ <span class="text-green-300">{duplicate.canonical}</span>
										</div>
										<div class="text-xs text-gray-400">
											Total usage: {duplicate.variants.reduce(
												(sum, v) => sum + v.paymentCount + v.budgetCount,
												0
											)} records
										</div>
									</div>
								{/each}
								{#if dedupePreview.duplicates.length > 5}
									<div class="text-xs text-gray-400">
										... and {dedupePreview.duplicates.length - 5} more groups
									</div>
								{/if}
							</div>
						{/if}
					{/if}
				</div>
			{/if}

			<div class="flex gap-4">
				<Button onclick={loadDedupePreview} variant="secondary" size="lg">Refresh Analysis</Button>

				{#if dedupePreview && dedupePreview.duplicatesFound > 0}
					<Button onclick={runDeduplication} variant="warning" size="lg" disabled={deduplicating}>
						{deduplicating ? 'Deduplicating...' : 'Run Deduplication'}
					</Button>
				{/if}
			</div>

			{#if dedupeError}
				<div class="mt-6 p-4 bg-red-900 border border-red-700 rounded-lg">
					<div class="text-red-300">
						❌ Error: {dedupeError}
						{#if dedupeError.includes('401')}
							<div class="mt-2 text-red-200 text-sm">
								This appears to be an authentication error. You may need to log in again.
							</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if dedupeResults}
				<div class="mt-6 p-4 bg-green-900 border border-green-700 rounded-lg">
					<div class="text-green-300">✅ Deduplication completed successfully!</div>
					<div class="mt-3 text-sm text-green-200">
						<div>Merchant groups processed: {dedupeResults.duplicatesProcessed}</div>
						<div>Payment records updated: {dedupeResults.paymentsUpdated}</div>
						<div>Budget assignments updated: {dedupeResults.budgetMerchantsUpdated}</div>
						<div>Duplicate budget assignments removed: {dedupeResults.budgetMerchantsRemoved}</div>
						{#if dedupeResults.errors && dedupeResults.errors.length > 0}
							<div class="mt-2 text-yellow-200">
								<div class="font-medium mb-2">⚠️ Warnings: {dedupeResults.errors.length} issues encountered</div>
								<div class="text-sm space-y-2 max-h-40 overflow-y-auto">
									{#each dedupeResults.errors as error}
										<div class="bg-yellow-900/30 border border-yellow-700 rounded p-2">
											{#if error.canonicalForm}
												<div class="font-medium text-yellow-300">Canonical Form: {error.canonicalForm}</div>
											{/if}
											{#if error.canonical}
												<div class="text-yellow-200">Canonical: {error.canonical}</div>
											{/if}
											{#if error.variants && error.variants.length > 0}
												<div class="text-yellow-200">Variants: {error.variants.join(', ')}</div>
											{/if}
											<div class="text-yellow-100 text-xs mt-1">{error.error}</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Merchant Consolidation Section -->
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-8">
			<h2 class="text-xl font-semibold mb-4">Merchant Consolidation</h2>

			<p class="text-gray-300 mb-6">
				Find and merge similar merchants that represent the same business but have variations in naming, 
				store numbers, phone numbers, or address formats. This helps consolidate duplicate merchant records 
				like "PINKBERRY 15012 NEW YORK" and "PINKBERRY 15038 NEW YORK" into a single "PINKBERRY" record.
			</p>

			{#if consolidatePreview}
				<div class="mb-6 p-4 bg-gray-700 border border-gray-600 rounded-lg">
					<h3 class="text-lg font-medium mb-3">Similarity Analysis</h3>

					{#if consolidatePreview.groupsFound === 0}
						<div class="text-green-300">
							✅ No similar merchants found for consolidation! Your merchant data is clean.
						</div>
					{:else}
						<div class="text-yellow-300 mb-4">
							⚠️ Found {consolidatePreview.groupsFound} groups of similar merchants affecting:
							<ul class="list-disc list-inside mt-2 text-sm">
								<li>{consolidatePreview.totalPaymentsAffected} total records</li>
								<li>{consolidatePreview.totalVariants} merchant variants</li>
							</ul>
						</div>

						{#if consolidatePreview.groups && consolidatePreview.groups.length > 0}
							<div class="text-sm">
								<h4 class="font-medium mb-2">Examples of similar merchants (showing first 5):</h4>
								{#each consolidatePreview.groups.slice(0, 5) as group}
									<div class="mb-2 p-2 bg-gray-600 rounded">
										<div class="font-medium text-blue-300">
											{group.pattern.replace('_', ' ').toUpperCase()} - Confidence: {Math.round(group.confidence * 100)}%
										</div>
										<div class="text-xs text-gray-300">
											Will consolidate: {group.variants.map((v) => v.merchant_normalized).join(', ')}
											→ <span class="text-green-300">{group.canonical}</span>
										</div>
										<div class="text-xs text-gray-400">
											Total usage: {group.variants.reduce((sum, v) => sum + v.count, 0)} records
										</div>
									</div>
								{/each}
								{#if consolidatePreview.groups.length > 5}
									<div class="text-xs text-gray-400">
										... and {consolidatePreview.groups.length - 5} more groups
									</div>
								{/if}
							</div>
						{/if}
					{/if}
				</div>
			{/if}

			<div class="flex gap-4">
				<Button onclick={loadConsolidatePreview} variant="secondary" size="lg">Refresh Analysis</Button>

				{#if consolidatePreview && consolidatePreview.groupsFound > 0}
					<Button onclick={runConsolidation} variant="warning" size="lg" disabled={consolidating}>
						{consolidating ? 'Consolidating...' : 'Run Consolidation'}
					</Button>
				{/if}
			</div>

			{#if consolidateError}
				<div class="mt-6 p-4 bg-red-900 border border-red-700 rounded-lg">
					<div class="text-red-300">
						❌ Error: {consolidateError}
						{#if consolidateError.includes('401')}
							<div class="mt-2 text-red-200 text-sm">
								This appears to be an authentication error. You may need to log in again.
							</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if consolidateResults}
				<div class="mt-6 p-4 bg-green-900 border border-green-700 rounded-lg">
					<div class="text-green-300">✅ Consolidation completed successfully!</div>
					<div class="mt-3 text-sm text-green-200">
						<div>Merchant groups processed: {consolidateResults.groupsProcessed}</div>
						<div>Payment records updated: {consolidateResults.paymentsUpdated}</div>
						<div>Budget assignments updated: {consolidateResults.budgetMerchantsUpdated}</div>
						<div>Duplicate budget assignments removed: {consolidateResults.budgetMerchantsRemoved}</div>
						{#if consolidateResults.errors && consolidateResults.errors.length > 0}
							<div class="mt-2 text-yellow-200">
								<div class="font-medium mb-2">⚠️ Warnings: {consolidateResults.errors.length} issues encountered</div>
								<div class="text-sm space-y-2 max-h-40 overflow-y-auto">
									{#each consolidateResults.errors as error}
										<div class="bg-yellow-900/30 border border-yellow-700 rounded p-2">
											{#if error.canonical}
												<div class="font-medium text-yellow-300">Canonical: {error.canonical}</div>
											{/if}
											{#if error.pattern}
												<div class="text-yellow-200">Pattern: {error.pattern.replace('_', ' ').toUpperCase()}</div>
											{/if}
											{#if error.variants && error.variants.length > 0}
												<div class="text-yellow-200">Variants: {error.variants.join(', ')}</div>
											{/if}
											<div class="text-yellow-100 text-xs mt-1">{error.error}</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</main>

<Footer />
