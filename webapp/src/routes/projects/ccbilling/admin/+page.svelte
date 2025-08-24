<script>
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Button from '$lib/components/Button.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let stats = null;
	let isRunning = false;
	let progress = null;
	let error = null;
	let success = null;

	async function loadStats() {
		try {
			const response = await fetch('/api/admin/normalize-merchants');
			if (response.ok) {
				stats = await response.json();
			} else {
				error = 'Failed to load statistics';
			}
		} catch (err) {
			error = 'Failed to load statistics: ' + err.message;
		}
	}

	async function startNormalization() {
		if (isRunning) return;
		
		isRunning = true;
		error = null;
		success = null;
		progress = null;

		try {
			const response = await fetch('/api/admin/normalize-merchants', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ batchSize: 50, offset: 0 })
			});

			if (response.ok) {
				const result = await response.json();
				progress = result;
				success = result.message;
				
				// Reload stats after successful normalization
				await loadStats();
			} else {
				const errorData = await response.json();
				error = errorData.error || 'Failed to start normalization';
			}
		} catch (err) {
			error = 'Failed to start normalization: ' + err.message;
		} finally {
			isRunning = false;
		}
	}

	async function runFullNormalization() {
		if (isRunning) return;
		
		isRunning = true;
		error = null;
		success = null;
		progress = null;

		let offset = 0;
		let totalProcessed = 0;
		let totalUpdated = 0;

		try {
			while (true) {
				const response = await fetch('/api/admin/normalize-merchants', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ batchSize: 50, offset })
				});

				if (response.ok) {
					const result = await response.json();
					progress = result;
					
					totalProcessed += result.paymentsProcessed;
					totalUpdated += result.paymentsUpdated;
					
					// Update progress display
					progress.totalProcessed = totalProcessed;
					progress.totalUpdated = totalUpdated;
					
					if (result.totalRemaining <= 0) {
						success = `Full normalization complete! Processed ${totalProcessed} payments and updated ${totalUpdated} merchants.`;
						break;
					}
					
					offset = result.nextOffset;
					
					// Small delay to avoid overwhelming the system
					await new Promise(resolve => setTimeout(resolve, 100));
				} else {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Failed to process batch');
				}
			}
		} catch (err) {
			error = 'Normalization failed: ' + err.message;
		} finally {
			isRunning = false;
			// Reload stats after completion
			await loadStats();
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
			<h1 class="text-4xl font-bold">Admin Panel</h1>
			<Button href="/projects/ccbilling" variant="secondary" size="lg">Back to CCBilling</Button>
		</div>

		<!-- Statistics Card -->
		{#if stats}
			<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
				<h2 class="text-2xl font-semibold mb-4">Merchant Normalization Status</h2>
				
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
						<div class="text-gray-300">Unique Merchants</div>
					</div>
				</div>

				{#if stats.payments.pending > 0}
					<div class="mt-4 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
						<div class="text-yellow-300 font-medium">
							{stats.payments.pending} payments need normalization
						</div>
					</div>
				{:else}
					<div class="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
						<div class="text-green-300 font-medium">
							✅ All merchants are normalized!
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Sample Normalizations -->
		{#if stats?.samples?.length > 0}
			<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
				<h2 class="text-2xl font-semibold mb-4">Sample Normalizations</h2>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-gray-700">
								<th class="text-left py-2">Original Merchant</th>
								<th class="text-left py-2">Normalized</th>
								<th class="text-left py-2">Details</th>
								<th class="text-left py-2">Count</th>
							</tr>
						</thead>
						<tbody>
							{#each stats.samples as sample}
								<tr class="border-b border-gray-700/50">
									<td class="py-2 text-gray-300">{sample.merchant}</td>
									<td class="py-2 text-blue-400 font-medium">{sample.merchant_normalized}</td>
									<td class="py-2 text-gray-400">{sample.merchant_details || '-'}</td>
									<td class="py-2 text-gray-300">{sample.count}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
			<h2 class="text-2xl font-semibold mb-4">Actions</h2>
			
			<div class="flex flex-wrap gap-4">
				<Button 
					onclick={startNormalization} 
					variant="primary" 
					size="lg"
					disabled={isRunning}
				>
					{isRunning ? 'Processing...' : 'Run Single Batch'}
				</Button>
				
				<Button 
					onclick={runFullNormalization} 
					variant="success" 
					size="lg"
					disabled={isRunning}
				>
					{isRunning ? 'Running Full Normalization...' : 'Run Full Normalization'}
				</Button>
				
				<Button 
					onclick={loadStats} 
					variant="secondary" 
					size="lg"
					disabled={isRunning}
				>
					Refresh Stats
				</Button>
			</div>

			{#if isRunning && progress}
				<div class="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
					<div class="text-blue-300 font-medium mb-2">Progress:</div>
					<div class="text-sm text-gray-300">
						{progress.message}
						{#if progress.totalProcessed !== undefined}
							<br>Total processed: {progress.totalProcessed} | Total updated: {progress.totalUpdated}
						{/if}
					</div>
				</div>
			{/if}

			{#if error}
				<div class="mt-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
					<div class="text-red-300 font-medium">Error:</div>
					<div class="text-sm text-gray-300">{error}</div>
				</div>
			{/if}

			{#if success}
				<div class="mt-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
					<div class="text-green-300 font-medium">Success:</div>
					<div class="text-sm text-gray-300">{success}</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<Footer />