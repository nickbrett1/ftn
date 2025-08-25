<script>
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Button from '$lib/components/Button.svelte';
	import { onMount } from 'svelte';

	let status = null;
	let loading = false;
	let normalizing = false;
	let output = [];
	let error = null;

	// Load initial status
	onMount(async () => {
		await loadStatus();
	});

	async function loadStatus() {
		try {
			loading = true;
			error = null;
			const response = await fetch('/api/admin/normalize-merchants');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			status = await response.json();
		} catch (err) {
			error = err.message;
			console.error('Failed to load status:', err);
		} finally {
			loading = false;
		}
	}

	async function startNormalization() {
		try {
			normalizing = true;
			output = [];
			error = null;
			
			// Add initial message
			output.push({ type: 'info', message: 'Starting merchant normalization process...', timestamp: new Date() });
			
			let offset = 0;
			let totalProcessed = 0;
			let hasMore = true;
			
			while (hasMore) {
				const response = await fetch('/api/admin/normalize-merchants', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						batchSize: 50,
						offset: offset
					})
				});
				
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				
				const result = await response.json();
				
				if (result.error) {
					throw new Error(result.error);
				}
				
				// Add progress message
				output.push({
					type: 'success',
					message: `Processed batch: ${result.paymentsProcessed} payments, ${result.paymentsUpdated} updated, ${result.budgetMerchantsUpdated} budget mappings updated`,
					timestamp: new Date()
				});
				
				// Add any errors
				if (result.errors && result.errors.length > 0) {
					result.errors.forEach(err => {
						output.push({
							type: 'error',
							message: `Error processing ${err.merchant || err.id}: ${err.error}`,
							timestamp: new Date()
						});
					});
				}
				
				totalProcessed += result.paymentsProcessed;
				offset = result.nextOffset;
				hasMore = result.totalRemaining > 0;
				
				// Add progress summary
				output.push({
					type: 'info',
					message: `Progress: ${totalProcessed} processed, ${result.totalRemaining} remaining`,
					timestamp: new Date()
				});
				
				// Small delay to avoid overwhelming the server
				await new Promise(resolve => setTimeout(resolve, 100));
			}
			
			output.push({
				type: 'success',
				message: '✅ Normalization complete! All merchants have been processed.',
				timestamp: new Date()
			});
			
			// Reload status to show final numbers
			await loadStatus();
			
		} catch (err) {
			error = err.message;
			output.push({
				type: 'error',
				message: `❌ Normalization failed: ${err.message}`,
				timestamp: new Date()
			});
			console.error('Normalization failed:', err);
		} finally {
			normalizing = false;
		}
	}

	function formatTimestamp(timestamp) {
		return timestamp.toLocaleTimeString();
	}

	function getOutputClass(type) {
		switch (type) {
			case 'success': return 'text-green-400';
			case 'error': return 'text-red-400';
			case 'info': return 'text-blue-400';
			default: return 'text-gray-300';
		}
	}
</script>

<Header />

<div class="min-h-screen bg-base-900 text-white">
	<div class="container mx-auto px-4 py-8">
		<div class="flex items-center justify-between mb-8">
			<h1 class="text-4xl font-bold">Admin Tools</h1>
			<Button href="/projects/ccbilling" variant="secondary" size="lg">Back to CCBilling</Button>
		</div>

		<!-- Status Section -->
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
			<h2 class="text-2xl font-semibold mb-4">Merchant Normalization Status</h2>
			
			<div class="mb-6 p-4 bg-blue-900 border border-blue-700 rounded-lg">
				<div class="text-blue-300 text-sm">
					<strong>How it works:</strong> The system processes all payments to determine if merchant names need normalization. 
					Some merchants may already be unique and won't be changed, while others will be grouped under standardized names 
					(e.g., "AMAZON.COM*123" becomes "AMAZON"). The "Actually Changed" count shows how many were modified.
				</div>
			</div>
			
			{#if loading}
				<div class="text-gray-300">Loading status...</div>
			{:else if error}
				<div class="text-red-400 mb-4">Error loading status: {error}</div>
				<Button onclick={loadStatus} variant="secondary" size="md">Retry</Button>
			{:else if status}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Payment Statistics -->
					<div class="bg-gray-700 rounded-lg p-4">
						<h3 class="text-lg font-medium mb-3">Payment Records</h3>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-300">Total Payments:</span>
								<span class="text-white font-mono">{status.payments.total}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-300">Processed:</span>
								<span class="text-blue-400 font-mono">{status.payments.processed || 0}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-300">Actually Changed:</span>
								<span class="text-green-400 font-mono">{status.payments.normalized}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-300">Still Need Processing:</span>
								<span class="text-yellow-400 font-mono">{status.payments.pending}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-300">Unique Merchants:</span>
								<span class="text-white font-mono">{status.payments.uniqueMerchants}</span>
							</div>
						</div>
					</div>

					<!-- Budget Merchant Statistics -->
					<div class="bg-gray-700 rounded-lg p-4">
						<h3 class="text-lg font-medium mb-3">Budget Mappings</h3>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-300">Total Mappings:</span>
								<span class="text-white font-mono">{status.budgetMerchants.total}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-300">Normalized:</span>
								<span class="text-green-400 font-mono">{status.budgetMerchants.normalized}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Sample Normalizations -->
				{#if status.samples && status.samples.length > 0}
					<div class="mt-6">
						<h3 class="text-lg font-medium mb-3">Sample Normalizations</h3>
						<div class="bg-gray-700 rounded-lg p-4">
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
								{#each status.samples as sample}
									<div class="bg-gray-600 rounded p-3">
										<div class="text-gray-300 mb-1">Original: {sample.merchant}</div>
										<div class="text-green-400 font-medium">Normalized: {sample.merchant_normalized}</div>
										{#if sample.merchant_details}
											<div class="text-blue-400 text-xs">Details: {sample.merchant_details}</div>
										{/if}
										<div class="text-gray-400 text-xs mt-1">Count: {sample.count}</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- Status Message -->
				<div class="mt-6 p-4 rounded-lg {status.payments.pending === 0 ? 'bg-green-900 border border-green-700' : 'bg-yellow-900 border border-yellow-700'}">
					<div class="text-center">
						{#if status.payments.pending === 0}
							<span class="text-green-400 font-medium">✅ {status.message}</span>
						{:else}
							<span class="text-yellow-400 font-medium">⚠️ {status.message}</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Action Section -->
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
			<h2 class="text-2xl font-semibold mb-4">Merchant Normalization</h2>
			
			{#if status && status.payments.pending > 0}
				<div class="mb-4">
					<p class="text-gray-300 mb-4">
						This will process {status.payments.pending} payments that still need merchant normalization.
						Note: Some payments may not need changes if their merchant names are already unique.
						The process runs in batches to avoid timeouts and shows real-time progress.
					</p>
					<Button 
						onclick={startNormalization} 
						variant="success" 
						size="lg"
						disabled={normalizing}
					>
						{normalizing ? 'Processing...' : 'Start Processing'}
					</Button>
				</div>
			{:else if status}
				<div class="text-green-400 text-center py-4">
					✅ All merchants have been processed! No action needed.
				</div>
			{/if}
		</div>

		<!-- Output Section -->
		{#if output.length > 0}
			<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
				<h2 class="text-2xl font-semibold mb-4">Process Output</h2>
				<div class="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
					{#each output as entry (entry.timestamp.getTime())}
						<div class="flex items-start gap-3 py-1">
							<span class="text-gray-500 text-sm font-mono flex-shrink-0">
								{formatTimestamp(entry.timestamp)}
							</span>
							<span class={getOutputClass(entry.type)}>
								{entry.message}
							</span>
						</div>
					{/each}
				</div>
				
				{#if normalizing}
					<div class="mt-4 text-center">
						<div class="inline-flex items-center gap-2 text-blue-400">
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
							Processing...
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Error Display -->
		{#if error && !normalizing}
			<div class="bg-red-900 border border-red-700 rounded-lg p-4 mt-6">
				<div class="text-red-400">
					<strong>Error:</strong> {error}
				</div>
			</div>
		{/if}
	</div>
</div>

<Footer />