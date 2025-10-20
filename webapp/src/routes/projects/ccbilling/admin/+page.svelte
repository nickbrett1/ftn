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


	// Load preview on component mount
	import { onMount } from 'svelte';
	onMount(() => {
		loadDedupePreview();
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
	</div>
</main>

<Footer />
