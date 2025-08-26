<script>
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Button from '$lib/components/Button.svelte';

	let normalizing = false;
	let results = null;
	let error = null;

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
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
			<h2 class="text-xl font-semibold mb-4">Database Normalization</h2>
			
			<p class="text-gray-300 mb-6">
				Run the merchant normalization process across all payment records and budget-to-merchant auto-association mappings. This will ensure all merchant names are consistently normalized and budget assignments stay in sync.
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
						<div>Budget to merchant auto-association mappings updated: {results.budgetMerchantsUpdated || 0}</div>
						{#if results.errors && results.errors.length > 0}
							<div class="mt-2 text-yellow-200">
								Warnings: {results.errors.length} issues encountered
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</main>

<Footer />