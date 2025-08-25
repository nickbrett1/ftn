<script>
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Button from '$lib/components/Button.svelte';
	import { onMount } from 'svelte';

	let stats = null;
	let isRunning = false;
	let progress = null;
	let errors = [];
	let message = '';

	async function loadStats() {
		try {
			const response = await fetch('/api/admin/normalize-merchants');
			if (response.ok) {
				stats = await response.json();
			} else {
				console.error('Failed to load stats:', response.statusText);
			}
		} catch (error) {
			console.error('Error loading stats:', error);
		}
	}

	async function runNormalization() {
		if (isRunning) return;
		
		isRunning = true;
		errors = [];
		message = '';
		progress = { processed: 0, updated: 0, totalRemaining: 0 };
		
		try {
			let offset = 0;
			let totalUpdated = 0;
			let totalProcessed = 0;
			
			while (true) {
				const response = await fetch('/api/admin/normalize-merchants', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ batchSize: 50, offset })
				});
				
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				
				const result = await response.json();
				
				if (!result.success) {
					throw new Error(result.error || 'Normalization failed');
				}
				
				totalUpdated += result.paymentsUpdated;
				totalProcessed += result.paymentsProcessed;
				
				progress = {
					processed: totalProcessed,
					updated: totalUpdated,
					totalRemaining: result.totalRemaining
				};
				
				if (result.errors && result.errors.length > 0) {
					errors.push(...result.errors);
				}
				
				message = result.message;
				
				// Check if we're done
				if (result.totalRemaining <= 0) {
					break;
				}
				
				offset = result.nextOffset;
				
				// Small delay to avoid overwhelming the server
				await new Promise(resolve => setTimeout(resolve, 100));
			}
			
			// Reload stats after completion
			await loadStats();
			
		} catch (error) {
			message = `Error: ${error.message}`;
			console.error('Normalization failed:', error);
		} finally {
			isRunning = false;
		}
	}

	onMount(() => {
		loadStats();
	});
</script>

<Header />

<div class="min-h-screen bg-base-900 text-white">
	<div class="container mx-auto px-4 py-8">
		<div class="flex items-center justify-between mb-8">
			<h1 class="text-4xl font-bold">Admin - Merchant Normalization</h1>
			<Button href="/projects/ccbilling" variant="secondary" size="lg">
				← Back to Billing Cycles
			</Button>
		</div>

		<!-- Statistics -->
		{#if stats}
			<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
				<h2 class="text-2xl font-semibold mb-4">Current Status</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<div class="text-center">
						<div class="text-3xl font-bold text-blue-400">{stats.payments.total}</div>
						<div class="text-gray-300">Total Payments</div>
					</div>
					<div class="text-center">
						<div class="text-3xl font-bold text-green-400">{stats.payments.normalized}</div>
						<div class="text-gray-300">Normalized</div>
					</div>
					<div class="text-center">
						<div class="text-3xl font-bold text-yellow-400">{stats.payments.pending}</div>
						<div class="text-gray-300">Pending</div>
					</div>
					<div class="text-center">
						<div class="text-3xl font-bold text-purple-400">{stats.payments.uniqueNormalized}</div>
						<div class="text-gray-300">Unique Normalized</div>
					</div>
				</div>
				
				{#if stats.budgetMerchants}
					<div class="mt-6 pt-6 border-t border-gray-700">
						<h3 class="text-lg font-semibold mb-3">Budget Merchant Mappings</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="text-center">
								<div class="text-2xl font-bold text-blue-400">{stats.budgetMerchants.total}</div>
								<div class="text-gray-300">Total Mappings</div>
							</div>
							<div class="text-center">
								<div class="text-2xl font-bold text-green-400">{stats.budgetMerchants.normalized}</div>
								<div class="text-gray-300">Normalized</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Action Section -->
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
			<h2 class="text-2xl font-semibold mb-4">Run Normalization</h2>
			<p class="text-gray-300 mb-6">
				This will process all pending merchant records and normalize them according to the established rules.
				The process runs in batches to avoid timeouts.
			</p>
			
			<div class="flex items-center gap-4 mb-6">
				<Button 
					onclick={runNormalization} 
					variant="success" 
					size="lg"
					disabled={isRunning}
				>
					{isRunning ? 'Running...' : 'Start Normalization'}
				</Button>
				
				{#if isRunning}
					<div class="text-yellow-400">Processing...</div>
				{/if}
			</div>

			{#if progress}
				<div class="bg-gray-700 rounded-lg p-4">
					<h3 class="text-lg font-semibold mb-3">Progress</h3>
					<div class="space-y-2">
						<div class="flex justify-between">
							<span>Processed:</span>
							<span class="font-mono">{progress.processed}</span>
						</div>
						<div class="flex justify-between">
							<span>Updated:</span>
							<span class="font-mono text-green-400">{progress.updated}</span>
						</div>
						<div class="flex justify-between">
							<span>Remaining:</span>
							<span class="font-mono text-yellow-400">{progress.totalRemaining}</span>
						</div>
					</div>
				</div>
			{/if}

			{#if message}
				<div class="mt-4 p-4 rounded-lg {message.includes('Error') ? 'bg-red-900 border border-red-700' : 'bg-green-900 border border-green-700'}">
					<div class="font-semibold">{message}</div>
				</div>
			{/if}
		</div>

		<!-- Sample Normalizations -->
		{#if stats && stats.samples && stats.samples.length > 0}
			<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
				<h2 class="text-2xl font-semibold mb-4">Sample Normalizations</h2>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-gray-700">
								<th class="text-left p-2">Original Merchant</th>
								<th class="text-left p-2">Normalized</th>
								<th class="text-left p-2">Details</th>
								<th class="text-left p-2">Count</th>
							</tr>
						</thead>
						<tbody>
							{#each stats.samples as sample}
								<tr class="border-b border-gray-700">
									<td class="p-2 font-mono text-gray-300">{sample.merchant}</td>
									<td class="p-2 font-semibold text-green-400">{sample.merchant_normalized}</td>
									<td class="p-2 text-gray-400">{sample.merchant_details || '-'}</td>
									<td class="p-2 text-right">{sample.count}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- Errors -->
		{#if errors.length > 0}
			<div class="bg-gray-800 border border-red-700 rounded-lg p-6 mt-8">
				<h2 class="text-2xl font-semibold mb-4 text-red-400">Errors</h2>
				<div class="space-y-2">
					{#each errors as error}
						<div class="bg-red-900 border border-red-700 rounded p-3">
							<div class="font-semibold">
								{error.type === 'budget_merchant' ? 'Budget Merchant' : 'Payment'} ID: {error.id}
							</div>
							<div class="text-gray-300">Merchant: {error.merchant}</div>
							<div class="text-red-300">Error: {error.error}</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<Footer />