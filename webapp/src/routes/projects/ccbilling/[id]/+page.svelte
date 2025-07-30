<script>
	import Button from '$lib/components/Button.svelte';

	export let data;
	$: ({ cycleId, cycle, statements, charges, creditCards } = data);

	function formatLocalDate(dateString) {
		if (!dateString) return '';
		const [year, month, day] = dateString.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
	}

	import { goto } from '$app/navigation';
	import { invalidate } from '$app/navigation';
	let showDeleteDialog = false;
	let isDeleting = false;
	let deleteError = '';

	// File upload state
	let showUploadForm = false;
	let isUploading = false;
	let uploadError = '';
	let selectedFile = null;
	let selectedCardId = '';

	// Parse statement state
	let parsingStatements = new Set();

	async function handleDelete() {
		isDeleting = true;
		deleteError = '';
		try {
			const response = await fetch('/projects/ccbilling/cycles', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: cycleId })
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete billing cycle');
			}
			// Invalidate the cache to ensure fresh data is loaded
			await invalidate('/projects/ccbilling');
			await goto('/projects/ccbilling');
		} catch (err) {
			deleteError = err.message;
		} finally {
			isDeleting = false;
			showDeleteDialog = false;
		}
	}

	async function handleFileUpload() {
		if (!selectedFile || !selectedCardId) {
			uploadError = 'Please select a file and credit card';
			return;
		}

		isUploading = true;
		uploadError = '';

		try {
			const formData = new FormData();
			formData.append('file', selectedFile);
			formData.append('credit_card_id', selectedCardId);

			const response = await fetch(`/projects/ccbilling/cycles/${cycleId}/statements`, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to upload statement');
			}

			// Refresh the page to show the new statement
			location.reload();
		} catch (err) {
			uploadError = err.message;
		} finally {
			isUploading = false;
		}
	}

	async function parseStatement(statementId) {
		// Add to parsing set
		parsingStatements.add(statementId);
		parsingStatements = parsingStatements; // Trigger reactivity

		try {
			const response = await fetch(`/projects/ccbilling/statements/${statementId}/parse`, {
				method: 'POST'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to parse statement');
			}

			// Refresh the page to show the parsed charges
			location.reload();
		} catch (err) {
			alert('Error parsing statement: ' + err.message);
		} finally {
			// Remove from parsing set
			parsingStatements.delete(statementId);
			parsingStatements = parsingStatements; // Trigger reactivity
		}
	}
</script>

<svelte:head>
	<title>Billing Cycle {cycleId}</title>
	<meta name="description" content="Manage billing cycle details and statements" />
</svelte:head>

<div class="container mx-auto p-4 space-y-8 max-w-6xl">
	<div class="flex justify-between items-start mb-8">
		<div>
			<h2 class="text-3xl font-bold text-white">Billing Cycle: {cycleId}</h2>
			<p class="text-gray-400 mt-2">
				{formatLocalDate(cycle.start_date)} - {formatLocalDate(cycle.end_date)}
			</p>
			<p class="text-sm text-gray-500 mt-1">
				Status: {cycle.closed ? 'Closed' : 'Open'}
			</p>
		</div>
		<div class="flex items-center space-x-3">
			{#if !cycle.closed}
				<div class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">Active</div>
			{:else}
				<div class="bg-gray-600 text-white px-3 py-1 rounded-full text-sm">Closed</div>
			{/if}
			<Button
				variant="danger"
				size="sm"
				onclick={() => {
					showDeleteDialog = true;
					deleteError = '';
				}}
			>
				Delete Cycle
			</Button>
		</div>
	</div>

	<!-- Delete confirmation dialog -->
	{#if showDeleteDialog}
		<div class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
			<div class="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-sm w-full shadow-lg">
				<h3 class="text-lg font-bold text-white mb-4">Delete Billing Cycle?</h3>
				<p class="text-gray-300 mb-6">
					Are you sure you want to delete this billing cycle? This action cannot be undone.
				</p>
				{#if deleteError}
					<div class="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
						{deleteError}
					</div>
				{/if}
				<div class="flex justify-end gap-2">
					<Button
						type="button"
						variant="secondary"
						disabled={isDeleting}
						onclick={() => (showDeleteDialog = false)}
					>
						Cancel
					</Button>
					<Button type="button" variant="danger" disabled={isDeleting} onclick={handleDelete}>
						{isDeleting ? 'Deleting...' : 'Delete'}
					</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Statements Section -->
	<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
		<div class="flex justify-between items-center mb-4">
			<h3 class="text-xl font-semibold text-white">Statements</h3>
			{#if !cycle.closed}
				{#if showUploadForm}
					<Button
						type="button"
						variant="secondary"
						onclick={() => {
							console.log('Cancel button clicked');
							showUploadForm = false;
						}}
					>
						Cancel
					</Button>
				{:else}
					<Button
						type="button"
						variant="success"
						onclick={() => {
							console.log('Upload button clicked');
							showUploadForm = true;
						}}
					>
						Upload Statement
					</Button>
				{/if}
			{/if}
		</div>

		{#if showUploadForm && !cycle.closed}
			<div class="bg-gray-700 border border-gray-600 rounded-lg p-4 mb-4">
				<h4 class="text-white font-medium mb-3">Upload New Statement</h4>
				{#if uploadError}
					<div class="bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded mb-3">
						{uploadError}
					</div>
				{/if}
				<div class="space-y-3">
					<div>
						<label for="pdf-file-input" class="block text-gray-300 mb-1">PDF File:</label>
						<div class="relative">
							<input
								id="pdf-file-input"
								type="file"
								accept="application/pdf"
								on:change={(e) => (selectedFile = e.target.files[0])}
								class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
							/>
							<div
								class="flex items-center justify-between bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-300"
							>
								<span class="truncate">
									{selectedFile ? selectedFile.name : 'Choose a PDF file...'}
								</span>
								<Button
									variant="secondary"
									size="sm"
									onclick={() => document.getElementById('pdf-file-input').click()}
									class="ml-2"
								>
									Browse
								</Button>
							</div>
						</div>
					</div>
					<div>
						<label for="credit-card-select" class="block text-gray-300 mb-1">Credit Card:</label>
						<select
							id="credit-card-select"
							bind:value={selectedCardId}
							class="block w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
						>
							<option value="">Select a credit card</option>
							{#each creditCards as card}
								<option value={card.id}>{card.name} (****{card.last4})</option>
							{/each}
						</select>
					</div>
					<div>
						<p class="text-gray-400 text-sm">
							Statement date will be automatically extracted from the PDF during processing.
						</p>
					</div>
					<Button type="button" variant="success" disabled={isUploading} onclick={handleFileUpload}>
						{isUploading ? 'Uploading...' : 'Upload Statement'}
					</Button>
				</div>
			</div>
		{/if}

		{#if statements.length === 0}
			<p class="text-gray-300">No statements uploaded yet.</p>
			<p class="text-gray-400 text-sm mt-2">
				Upload credit card statements to begin processing charges.
			</p>
		{:else}
			<div class="space-y-3">
				{#each statements as statement}
					{@const card = creditCards.find((c) => c.id === statement.credit_card_id)}
					<div class="bg-gray-700 border border-gray-600 rounded-lg p-4">
						<div class="flex justify-between items-center">
							<div>
								<h4 class="text-white font-medium">{statement.filename}</h4>
								<p class="text-gray-400 text-sm">
									{card?.name} (****{card?.last4}) • Statement Date: {formatLocalDate(
										statement.statement_date
									)}
								</p>
								<p class="text-gray-500 text-xs">
									Uploaded: {new Date(statement.uploaded_at).toLocaleDateString()}
								</p>
							</div>
							<div class="space-x-2">
								<Button
									type="button"
									variant="success"
									size="sm"
									disabled={parsingStatements.has(statement.id)}
									onclick={() => parseStatement(statement.id)}
								>
									{#if parsingStatements.has(statement.id)}
										<div class="flex items-center space-x-2">
											<div class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
											<span>Parsing...</span>
										</div>
									{:else}
										Parse
									{/if}
								</Button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Charges Section -->
	{#if charges.length > 0}
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
			<h3 class="text-xl font-semibold text-white mb-4">Charges ({charges.length})</h3>
			<div class="space-y-2">
				{#each charges as charge}
					<div class="bg-gray-700 border border-gray-600 rounded-lg p-3">
						<div class="flex justify-between items-center">
							<div>
								<h4 class="text-white font-medium">{charge.merchant}</h4>
								<p class="text-gray-400 text-sm">
									{charge.card_name} (****{charge.last4})
								</p>
							</div>
							<div class="text-right">
								<p class="text-white font-medium">${charge.amount.toFixed(2)}</p>
								<p class="text-gray-400 text-sm">Allocated to: {charge.allocated_to}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if !showUploadForm}
		<div>
			<Button href="/projects/ccbilling" variant="secondary" size="lg"
				>Back to Billing Cycles</Button
			>
		</div>
	{/if}
</div>
