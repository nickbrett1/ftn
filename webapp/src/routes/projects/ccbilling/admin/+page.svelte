<script>
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Button from '$lib/components/Button.svelte';

	let normalizing = false;
	let results = null;
	let error = null;
	let status = null;
	let debugInfo = null;
	let loadingStatus = false;
	let loadingDebug = false;

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
			// Refresh status after normalization
			await loadStatus();
		} catch (err) {
			error = err.message;
		} finally {
			normalizing = false;
		}
	}



	async function loadStatus() {
		loadingStatus = true;
		try {
			const response = await fetch('/api/admin/normalize-merchants');
			if (response.ok) {
				status = await response.json();
			}
		} catch (err) {
			console.error('Failed to load status:', err);
		} finally {
			loadingStatus = false;
		}
	}

	async function loadDebugInfo() {
		loadingDebug = true;
		try {
			// Load detailed debug information
			const response = await fetch('/api/admin/normalize-merchants/debug');
			if (response.ok) {
				debugInfo = await response.json();
			}
		} catch (err) {
			console.error('Failed to load debug info:', err);
		} finally {
			loadingDebug = false;
		}
	}

	onMount(() => {
		loadStatus();
	});
</script>

<svelte:head>
	<title>Admin Tools - CC Billing</title>
</svelte:head>

<Header />

<main class="container mx-auto px-4 py-8">
	<div class="max-w-6xl mx-auto">
		<div class="flex items-center justify-between mb-8">
			<h1 class="text-3xl font-bold">Admin Tools</h1>
			<Button href="/projects/ccbilling" variant="secondary" size="lg">Back to Billing Cycles</Button>
		</div>

		<!-- Database Normalization Section -->
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
			<h2 class="text-xl font-semibold mb-4">Database Normalization</h2>
			
			<p class="text-gray-300 mb-6">
				Run the merchant normalization process across all payment records.
			</p>

			<Button 
				onclick={runNormalization} 
				variant="success" 
				size="lg"
				disabled={normalizing}
			>
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
					<div class="text-green-300">
						✅ Normalization completed successfully!
					</div>
					<div class="mt-3 text-sm text-green-200">
						<div>Payments updated: {results.paymentsUpdated}</div>
						<div>Budget merchants updated: {results.budgetMerchantsUpdated || 0}</div>
						{#if results.errors && results.errors.length > 0}
							<div class="mt-2 text-yellow-200">
								Warnings: {results.errors.length} issues encountered
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Normalization Status Section -->
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-semibold">Normalization Status</h2>
				<Button 
					onclick={loadStatus} 
					variant="secondary" 
					size="sm"
					disabled={loadingStatus}
				>
					{loadingStatus ? 'Loading...' : 'Refresh'}
				</Button>
			</div>

			{#if loadingStatus}
				<div class="text-gray-400">Loading status...</div>
			{:else if status}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Payment Statistics -->
					<div class="bg-gray-700 rounded-lg p-4">
						<h3 class="text-lg font-medium mb-3 text-blue-300">Payment Records</h3>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-300">Total payments:</span>
								<span class="text-white">{status.payments.total}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-300">Normalized:</span>
								<span class="text-green-400">{status.payments.normalized}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-300">Pending:</span>
								<span class="text-yellow-400">{status.payments.pending}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-300">Unique merchants:</span>
								<span class="text-white">{status.payments.uniqueMerchants}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-300">Unique normalized:</span>
								<span class="text-white">{status.payments.uniqueNormalized}</span>
							</div>
						</div>
					</div>

					<!-- Budget Merchant Statistics -->
					<div class="bg-gray-700 rounded-lg p-4">
						<h3 class="text-lg font-medium mb-3 text-purple-300">Budget Merchants</h3>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-300">Total mappings:</span>
								<span class="text-white">{status.budgetMerchants.total}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-300">Normalized:</span>
								<span class="text-green-400">{status.budgetMerchants.normalized}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Sample Normalizations -->
				{#if status.samples && status.samples.length > 0}
					<div class="mt-6">
						<h3 class="text-lg font-medium mb-3 text-green-300">Sample Normalizations</h3>
						<div class="bg-gray-700 rounded-lg p-4 overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-gray-600">
										<th class="text-left text-gray-300 pb-2">Original Merchant</th>
										<th class="text-left text-gray-300 pb-2">Normalized</th>
										<th class="text-left text-gray-300 pb-2">Details</th>
										<th class="text-left text-gray-300 pb-2">Count</th>
									</tr>
								</thead>
								<tbody>
									{#each status.samples as sample}
										<tr class="border-b border-gray-600">
											<td class="py-2 text-gray-200 font-mono text-xs">{sample.merchant}</td>
											<td class="py-2 text-green-400 font-medium">{sample.merchant_normalized}</td>
											<td class="py-2 text-gray-300 text-xs">{sample.merchant_details || '-'}</td>
											<td class="py-2 text-gray-400">{sample.count}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<!-- UNITED Airlines Status -->
				{#if status.unitedInfo && status.unitedInfo.length > 0}
					<div class="mt-6">
						<h3 class="text-lg font-medium mb-3 text-red-300">UNITED Airlines Status</h3>
						<div class="bg-gray-700 rounded-lg p-4">
							<div class="text-sm text-gray-300 mb-3">
								This shows how UNITED transactions are currently normalized:
							</div>
							<div class="space-y-2">
								{#each status.unitedInfo as info}
									<div class="flex justify-between items-center bg-gray-600 rounded p-2">
										<span class="text-gray-200 font-mono">
											{info.merchant_normalized || 'NULL/Empty'}
										</span>
										<span class="text-gray-400">{info.count} transactions</span>
									</div>
								{/each}
							</div>
							{#if status.unitedInfo.length === 1 && status.unitedInfo[0].merchant_normalized === 'UNITED'}
								<div class="mt-3 p-2 bg-green-900 border border-green-700 rounded text-green-300 text-sm">
									✅ All UNITED transactions are properly normalized to "UNITED"
								</div>
							{:else}
								<div class="mt-3 p-2 bg-yellow-900 border border-yellow-700 rounded text-yellow-300 text-sm">
									⚠️ UNITED transactions are not consistently normalized. Check debug info below.
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Pending Merchants -->
				{#if status.pendingMerchants && status.pendingMerchants.length > 0}
					<div class="mt-6">
						<h3 class="text-lg font-medium mb-3 text-yellow-300">Merchants Still Needing Normalization</h3>
						<div class="bg-gray-700 rounded-lg p-4">
							<div class="text-sm text-gray-300 mb-3">
								These merchants still need to be normalized:
							</div>
							<div class="space-y-1 max-h-40 overflow-y-auto">
								{#each status.pendingMerchants as merchant}
									<div class="flex justify-between items-center bg-gray-600 rounded p-2">
										<span class="text-gray-200 font-mono text-xs">{merchant.merchant}</span>
										<span class="text-gray-400 text-sm">{merchant.count} transactions</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Debug Information Section -->
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-semibold">Debug Information</h2>
				<Button 
					onclick={loadDebugInfo} 
					variant="secondary" 
					size="sm"
					disabled={loadingDebug}
				>
					{loadingDebug ? 'Loading...' : 'Load Debug Info'}
				</Button>
			</div>

			{#if loadingDebug}
				<div class="text-gray-400">Loading debug information...</div>
			{:else if debugInfo}
				<!-- UNITED Airlines Debug -->
				<div class="mb-6">
					<h3 class="text-lg font-medium mb-3 text-red-300">UNITED Airlines Debug</h3>
					<div class="bg-gray-700 rounded-lg p-4">
						{#if debugInfo.unitedMerchants && debugInfo.unitedMerchants.length > 0}
							<div class="text-sm text-gray-300 mb-3">
								Found {debugInfo.unitedMerchants.length} UNITED transactions
							</div>
							<div class="space-y-2 max-h-60 overflow-y-auto">
								{#each debugInfo.unitedMerchants as merchant}
									<div class="bg-gray-600 rounded p-2 text-xs font-mono">
										<div class="text-red-400">Original: {merchant.merchant}</div>
										<div class="text-green-400">Normalized: {merchant.merchant_normalized}</div>
										<div class="text-blue-400">Details: {merchant.merchant_details || 'N/A'}</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-gray-400">No UNITED transactions found</div>
						{/if}
					</div>
				</div>

				<!-- Merchant Picker Debug -->
				<div class="mb-6">
					<h3 class="text-lg font-medium mb-3 text-blue-300">Merchant Picker Debug</h3>
					<div class="bg-gray-700 rounded-lg p-4">
						{#if debugInfo.recentMerchants && debugInfo.recentMerchants.length > 0}
							<div class="text-sm text-gray-300 mb-3">
								Recent merchants that would appear in picker: {debugInfo.recentMerchants.length}
							</div>
							<div class="space-y-1 max-h-40 overflow-y-auto">
								{#each debugInfo.recentMerchants as merchant}
									<div class="text-sm font-mono text-gray-200">{merchant}</div>
								{/each}
							</div>
						{:else}
							<div class="text-gray-400">No recent merchants found</div>
						{/if}
					</div>
				</div>

				<!-- Database Schema Check -->
				<div class="mb-6">
					<h3 class="text-lg font-medium mb-3 text-yellow-300">Database Schema Check</h3>
					<div class="bg-gray-700 rounded-lg p-4">
						<div class="text-sm space-y-2">
							<div class="flex justify-between">
								<span class="text-gray-300">Payment table has merchant_normalized:</span>
								<span class="text-white">{debugInfo.schemaCheck?.paymentHasMerchantNormalized ? '✅ Yes' : '❌ No'}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-300">Budget merchant table has merchant_normalized:</span>
								<span class="text-white">{debugInfo.schemaCheck?.budgetMerchantHasMerchantNormalized ? '✅ Yes' : '❌ No'}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Bulk Update Status -->
				{#if debugInfo.bulkUpdateStatus && debugInfo.bulkUpdateStatus.length > 0}
					<div class="mb-6">
						<h3 class="text-lg font-medium mb-3 text-purple-300">Bulk Update Status</h3>
						<div class="bg-gray-700 rounded-lg p-4">
							<div class="text-sm text-gray-300 mb-3">
								Merchants that were updated by bulk pattern updates:
							</div>
							<div class="space-y-2 max-h-40 overflow-y-auto">
								{#each debugInfo.bulkUpdateStatus as status}
									<div class="flex justify-between items-center bg-gray-600 rounded p-2">
										<span class="text-gray-200 font-mono">{status.merchant_normalized}</span>
										<span class="text-gray-400">{status.count} transactions</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- UNITED Statistics -->
				{#if debugInfo.unitedStats}
					<div class="mb-6">
						<h3 class="text-lg font-medium mb-3 text-red-300">UNITED Airlines Statistics</h3>
						<div class="bg-gray-700 rounded-lg p-4">
							<div class="text-sm space-y-2">
								<div class="flex justify-between">
									<span class="text-gray-300">Total UNITED transactions:</span>
									<span class="text-white">{debugInfo.unitedStats.total_united}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-300">Normalized to "UNITED":</span>
									<span class="text-green-400">{debugInfo.unitedStats.normalized_to_united}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-300">Not normalized to "UNITED":</span>
									<span class="text-yellow-400">{debugInfo.unitedStats.not_normalized_to_united}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-300">Missing normalization:</span>
									<span class="text-red-400">{debugInfo.unitedStats.missing_normalization}</span>
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Normalization Errors -->
				{#if debugInfo.normalizationErrors && debugInfo.normalizationErrors.length > 0}
					<div class="mb-6">
						<h3 class="text-lg font-medium mb-3 text-red-300">UNITED Normalization Errors</h3>
						<div class="bg-gray-700 rounded-lg p-4">
							<div class="text-sm text-gray-300 mb-3">
								UNITED transactions that failed normalization:
							</div>
							<div class="space-y-2 max-h-40 overflow-y-auto">
								{#each debugInfo.normalizationErrors as error}
									<div class="bg-gray-600 rounded p-2 text-xs font-mono">
										<div class="text-red-400">Original: {error.merchant}</div>
										<div class="text-yellow-400">Normalized: {error.merchant_normalized || 'NULL'}</div>
										<div class="text-blue-400">Details: {error.merchant_details || 'N/A'}</div>
										<div class="text-gray-400">Count: {error.count}</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</main>

<Footer />