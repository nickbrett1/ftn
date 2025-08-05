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

	// Parse statement state
	let parsingStatements = new Set();

	// Delete statement state
	let deletingStatements = new Set();
	let showDeleteStatementDialog = false;
	let statementToDelete = null;

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
		if (!selectedFile) {
			uploadError = 'Please select a file';
			return;
		}

		isUploading = true;
		uploadError = '';

		try {
			// Create form data with PDF file
			const formData = new FormData();
			formData.append('file', selectedFile);

			const uploadResponse = await fetch(`/projects/ccbilling/cycles/${cycleId}/statements`, {
				method: 'POST',
				body: formData
			});

			if (!uploadResponse.ok) {
				const errorData = await uploadResponse.json();
				throw new Error(errorData.error || 'Failed to upload statement');
			}

			// Refresh the page to show the new statement
			location.reload();
		} catch (err) {
			console.error('❌ Upload failed:', err);
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
			// First, get the statement details to download the PDF
			const statementResponse = await fetch(`/projects/ccbilling/statements/${statementId}`);
			if (!statementResponse.ok) {
				throw new Error('Failed to get statement details');
			}
			const statement = await statementResponse.json();

			// Download the PDF from R2
			const pdfResponse = await fetch(`/projects/ccbilling/statements/${statementId}/pdf`);
			if (!pdfResponse.ok) {
				throw new Error('Failed to download PDF');
			}
			const pdfBlob = await pdfResponse.blob();
			const pdfFile = new File([pdfBlob], statement.filename, { type: 'application/pdf' });

			// Parse the PDF on the client-side
			const { PDFService } = await import('$lib/ccbilling-pdf-service.js');
			const pdfService = new PDFService();

			const parsedData = await pdfService.parseStatement(pdfFile);

			// Send the parsed data to the server
			const parseResponse = await fetch(`/projects/ccbilling/statements/${statementId}/parse`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					parsedData: parsedData
				})
			});

			if (!parseResponse.ok) {
				const errorData = await parseResponse.json();
				throw new Error(errorData.error || 'Failed to process parsed data');
			}

			// Refresh the page to show the updated charges
			location.reload();
		} catch (err) {
			console.error('❌ Parse failed:', err);
			alert('Error parsing statement: ' + err.message);
		} finally {
			// Remove from parsing set
			parsingStatements.delete(statementId);
			parsingStatements = parsingStatements; // Trigger reactivity
		}
	}

	async function deleteStatement(statementId) {
		// Add to deleting set
		deletingStatements.add(statementId);
		deletingStatements = deletingStatements; // Trigger reactivity

		try {
			const response = await fetch(`/projects/ccbilling/statements/${statementId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete statement');
			}

			// Refresh the page to show the updated statements
			location.reload();
		} catch (err) {
			alert('Error deleting statement: ' + err.message);
		} finally {
			// Remove from deleting set
			deletingStatements.delete(statementId);
			deletingStatements = deletingStatements; // Trigger reactivity
			showDeleteStatementDialog = false;
			statementToDelete = null;
		}
	}

	function confirmDeleteStatement(statement) {
		statementToDelete = statement;
		showDeleteStatementDialog = true;
	}
</script>

<svelte:head>
	<title
		>Billing Cycle: {formatLocalDate(cycle.start_date)} - {formatLocalDate(cycle.end_date)}</title
	>
	<meta name="description" content="Manage billing cycle details and statements" />
</svelte:head>

<div class="container mx-auto p-4 space-y-8 max-w-6xl">
	<div class="flex justify-between items-start mb-8">
		<div>
			<h2 class="text-3xl font-bold text-white">
				Billing Cycle: {formatLocalDate(cycle.start_date)} - {formatLocalDate(cycle.end_date)}
			</h2>
		</div>
		<div class="flex items-center space-x-3">
			{#if !cycle.closed}
				<div class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">Open</div>
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

	<!-- Delete statement confirmation dialog -->
	{#if showDeleteStatementDialog && statementToDelete}
		<div class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
			<div class="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-sm w-full shadow-lg">
				<h3 class="text-lg font-bold text-white mb-4">Delete Statement?</h3>
				<p class="text-gray-300 mb-2">
					Are you sure you want to delete "{statementToDelete.filename}"?
				</p>
				<p class="text-gray-400 text-sm mb-6">
					This will also delete all associated charges. This action cannot be undone.
				</p>
				<div class="flex justify-end gap-2">
					<Button
						type="button"
						variant="secondary"
						disabled={deletingStatements.has(statementToDelete.id)}
						onclick={() => {
							showDeleteStatementDialog = false;
							statementToDelete = null;
						}}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="danger"
						disabled={deletingStatements.has(statementToDelete.id)}
						onclick={() => deleteStatement(statementToDelete.id)}
					>
						{deletingStatements.has(statementToDelete.id) ? 'Deleting...' : 'Delete'}
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
						<p class="text-gray-400 text-sm">
							Credit card will be automatically identified from the statement during processing.
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
									{card ? `${card.name} (****${card.last4})` : ''}{statement.statement_date
										? ` • Statement Date: ${formatLocalDate(statement.statement_date)}`
										: ''}
								</p>
								<p class="text-gray-500 text-xs">
									Uploaded: {new Date(statement.uploaded_at + 'Z').toLocaleString()}
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
								<Button
									type="button"
									variant="danger"
									size="sm"
									disabled={deletingStatements.has(statement.id)}
									onclick={() => confirmDeleteStatement(statement)}
								>
									{#if deletingStatements.has(statement.id)}
										<div class="flex items-center space-x-2">
											<div class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
											<span>Deleting...</span>
										</div>
									{:else}
										Delete
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
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-gray-600">
							<th class="text-left text-gray-300 font-medium pb-2">Date</th>
							<th class="text-left text-gray-300 font-medium pb-2">Merchant</th>
							<th class="text-left text-gray-300 font-medium pb-2">Card</th>
							<th class="text-left text-gray-300 font-medium pb-2">Allocation</th>
							<th class="text-right text-gray-300 font-medium pb-2">Amount</th>
							<th class="text-left text-gray-300 font-medium pb-2">Currency</th>
						</tr>
					</thead>
					<tbody>
						{#each charges as charge}
							<tr class="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
								<td class="text-gray-300 text-sm py-2">
									{charge.transaction_date
										? formatLocalDate(charge.transaction_date)
										: formatLocalDate(charge.created_at?.split('T')[0])}
								</td>
								<td class="text-white py-2">{charge.merchant}</td>
								<td class="text-gray-300 text-sm py-2">{charge.card_name}</td>
								<td class="text-gray-300 text-sm py-2">{charge.allocated_to || 'None'}</td>
								<td class="text-right py-2">
									<span class="text-white font-medium {charge.amount < 0 ? 'text-red-400' : ''}">
										{charge.amount < 0 ? '-' : ''}${Math.abs(charge.amount).toFixed(2)}
									</span>
								</td>
								<td class="text-gray-300 text-sm py-2">
									{#if charge.is_foreign_currency && charge.foreign_currency_amount && charge.foreign_currency_type}
										<span class="text-blue-400">
											{charge.foreign_currency_amount}
											{charge.foreign_currency_type}
										</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
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
