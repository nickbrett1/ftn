<script>
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Button from '$lib/components/Button.svelte';

	let normalizing = false;
	let results = null;
	let error = null;
	let status = null;
	let loadingStatus = false;

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

	onMount(() => {
		loadStatus();
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
			<Button href="/projects/ccbilling" variant="secondary" size="lg">Back to Billing Cycles</Button>
		</div>

		<!-- Database Normalization Section -->
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
			<h2 class="text-xl font-semibold mb-4">Database Normalization</h2>
			
			<p class="text-gray-300 mb-6">
				Run the merchant normalization process across all payment records. This will ensure all merchant names are consistently normalized.
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
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
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

				<!-- Status Message -->
				<div class="mt-6 p-4 bg-gray-700 rounded-lg">
					<div class="text-gray-200 text-center">
						{status.message}
					</div>
				</div>
			{/if}
		</div>
	</div>
</main>

<Footer />