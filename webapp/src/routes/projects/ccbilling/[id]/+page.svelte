<script>
	import Button from '$lib/components/Button.svelte';

	/** @type {import('./$types').PageProps} */
	let { data } = $props();

	function formatLocalDate(dateString) {
		if (!dateString) return '';
		const [year, month, day] = dateString.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
	}

	function formatShortDate(dateString) {
		if (!dateString) return '';
		const [year, month, day] = dateString.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		// Explicitly format as MM/DD
		return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
	}

	// Function to format merchant name with flight details
	function formatMerchantName(charge) {
		if (!charge.flight_details) {
			return charge.merchant;
		}

		const flight = charge.flight_details;
		const airports = [];

		if (flight.departure_airport) {
			airports.push(flight.departure_airport);
		}
		if (flight.arrival_airport) {
			airports.push(flight.arrival_airport);
		}

		if (airports.length > 0) {
			return `${charge.merchant} (${airports.join(', ')})`;
		}

		return charge.merchant;
	}

	// Function to format foreign currency information
	function formatForeignCurrency(charge) {
		if (
			!charge.is_foreign_currency ||
			!charge.foreign_currency_amount ||
			!charge.foreign_currency_type
		) {
			return null;
		}

		return `${charge.foreign_currency_amount} ${charge.foreign_currency_type}`;
	}

	import { goto } from '$app/navigation';
	import { invalidate } from '$app/navigation';
	let showDeleteDialog = $state(false);
	let isDeleting = $state(false);
	let deleteError = $state('');

	// File upload state
	let showUploadForm = $state(false);
	let isUploading = $state(false);
	let uploadError = $state('');
	let selectedFile = $state(null);

	// Parse statement state
	let parsingStatements = $state(new Set());
	let parseError = $state('');

	// Delete statement state
	let deletingStatements = $state(new Set());
	let showDeleteStatementDialog = $state(false);
	let statementToDelete = $state(null);

	// Card details state for mobile
	let showCardDetails = $state(false);
	let selectedCardName = $state('');
	let isShowingCardInfo = $state(false); // Prevent rapid successive clicks

	// Allocation editing state
	let updatingAllocations = $state(new Set());

	// Calculate running totals
	let allocationTotals = $derived(
		data.charges.reduce((totals, charge) => {
			const allocation = charge.allocated_to || 'None';
			if (!totals[allocation]) {
				totals[allocation] = 0;
			}
			totals[allocation] += charge.amount;
			return totals;
		}, {})
	);

	// Get budget names for allocation options
	let budgetNames = $derived(data.budgets.map((b) => b.name));

	function showCardInfo(cardName) {
		// Prevent multiple rapid clicks
		if (isShowingCardInfo) return;

		isShowingCardInfo = true;
		selectedCardName = cardName;
		showCardDetails = true;

		// Reset the flag after a short delay
		setTimeout(() => {
			isShowingCardInfo = false;
		}, 300);
	}

	async function updateChargeAllocation(chargeId, newAllocation) {
		if (updatingAllocations.has(chargeId)) return;

		updatingAllocations.add(chargeId);

		try {
			const response = await fetch(`/projects/ccbilling/charges/${chargeId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					merchant: data.charges.find((c) => c.id === chargeId).merchant,
					amount: data.charges.find((c) => c.id === chargeId).amount,
					allocated_to: newAllocation
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update allocation');
			}

			// Update the local charge data
			const chargeIndex = data.charges.findIndex((c) => c.id === chargeId);
			if (chargeIndex !== -1) {
				data.charges[chargeIndex].allocated_to = newAllocation;
				data.charges = [...data.charges]; // Trigger reactivity
			}
		} catch (error) {
			console.error('Error updating allocation:', error);
			// Could add a toast notification here
		} finally {
			updatingAllocations.delete(chargeId);
		}
	}

	function getAllocationIcon(allocation) {
		const icons = {
			None: '❌',
			Groceries: '🛒',
			Dining: '🍽️',
			Transportation: '🚗',
			Entertainment: '🎬',
			Shopping: '🛍️',
			Travel: '✈️',
			Utilities: '💡',
			Healthcare: '🏥',
			Other: '📦'
		};
		// Handle null, undefined, or empty string as 'None'
		const normalizedAllocation = !allocation || allocation === '' ? 'None' : allocation;
		return icons[normalizedAllocation] || '📦';
	}

	function getNextAllocation(currentAllocation) {
		const options = ['None', ...budgetNames];
		const currentIndex = options.indexOf(currentAllocation || 'None');
		const nextIndex = (currentIndex + 1) % options.length;
		return options[nextIndex];
	}

	async function handleDelete() {
		isDeleting = true;
		deleteError = '';
		try {
			const response = await fetch('/projects/ccbilling/cycles', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: data.cycleId })
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete billing cycle');
			}
			// Invalidate the cache to ensure fresh data is loaded
			await invalidate('statements');
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

			const uploadResponse = await fetch(`/projects/ccbilling/cycles/${data.cycleId}/statements`, {
				method: 'POST',
				body: formData
			});

			if (!uploadResponse.ok) {
				const errorData = await uploadResponse.json();
				console.error('❌ Upload failed with status:', uploadResponse.status, errorData);
				throw new Error(errorData.error || 'Failed to upload statement');
			}
			const responseData = await uploadResponse.json();

			// Reset form
			selectedFile = null;
			showUploadForm = false;

			// Use invalidate() - the proper SvelteKit way
			await invalidate(`cycle-${data.cycleId}`);
		} catch (err) {
			console.error('❌ Upload failed:', err);
			uploadError = err.message;
		} finally {
			isUploading = false;
		}
	}

	async function parseStatement(statementId) {
		if (parsingStatements.has(statementId)) return;

		parsingStatements.add(statementId);
		parseError = ''; // Clear previous errors

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
			const { PDFService } = await import('$lib/client/ccbilling-pdf-service.js');
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
				throw new Error(errorData.error || 'Failed to parse statement');
			}

			// Clear parsing state before invalidating
			parsingStatements.delete(statementId);

			// Use invalidate() to refresh the data instead of reloading
			await invalidate(`cycle-${data.cycleId}`);
		} catch (err) {
			console.error('Error parsing statement:', err);
			// Format error messages to be more user-friendly
			let userFriendlyError = err.message;

			// Replace technical terms with user-friendly language
			userFriendlyError = userFriendlyError.replace(/last4/g, 'Last 4 Digits');
			userFriendlyError = userFriendlyError.replace(
				/No matching credit card found for last4: (\d+)/,
				'No matching credit card found for Last 4 Digits: $1'
			);
			userFriendlyError = userFriendlyError.replace(
				/No credit card information found in the statement/,
				'No credit card information found in the statement. Please ensure the statement contains valid credit card details.'
			);
			userFriendlyError = userFriendlyError.replace(
				/Failed to download PDF/,
				'Failed to download the statement file. Please try again.'
			);
			userFriendlyError = userFriendlyError.replace(
				/Failed to parse statement/,
				'Failed to process the statement. Please try again.'
			);
			userFriendlyError = userFriendlyError.replace(
				/Failed to get statement details/,
				'Failed to get statement details. Please try again.'
			);

			parseError = userFriendlyError;
		} finally {
			// Ensure parsing state is cleared even if invalidation fails
			parsingStatements.delete(statementId);
		}
	}

	async function deleteStatement(statementId) {
		if (deletingStatements.has(statementId)) return;

		deletingStatements.add(statementId);

		try {
			const response = await fetch(`/projects/ccbilling/statements/${statementId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete statement');
			}

			console.log('✅ Statement deleted successfully');

			// Use invalidate() - the proper SvelteKit way
			await invalidate(`cycle-${data.cycleId}`);
		} catch (err) {
			console.error('Error deleting statement:', err);
		} finally {
			deletingStatements.delete(statementId);
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
		>Billing Cycle: {formatLocalDate(data.cycle.start_date)} - {formatLocalDate(
			data.cycle.end_date
		)}</title
	>
	<meta name="description" content="Manage billing cycle details and statements" />
</svelte:head>

<div class="container mx-auto p-4 space-y-8 max-w-6xl pb-32">
	<div class="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
		<div class="flex-1">
			<h2 class="text-2xl sm:text-3xl font-bold text-white">
				Billing Cycle: {formatLocalDate(data.cycle.start_date)} - {formatLocalDate(
					data.cycle.end_date
				)}
			</h2>
		</div>
		<div class="flex items-center space-x-3">
			{#if !data.cycle.closed}
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
						onclick={() => (showDeleteStatementDialog = false)}
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

	<!-- Parse error dialog -->
	{#if parseError}
		<div class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
			<div class="bg-gray-900 border border-red-500 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
				<div class="flex items-center mb-4">
					<div class="flex-shrink-0">
						<div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
							<span class="text-white text-sm font-bold">!</span>
						</div>
					</div>
					<div class="ml-3">
						<h3 class="text-lg font-semibold text-white">Parse Error</h3>
					</div>
				</div>
				<div class="bg-gray-800 border border-gray-700 rounded p-4 mb-6">
					<p class="text-gray-200 text-sm leading-relaxed">{parseError}</p>
				</div>
				<div class="flex justify-end">
					<Button type="button" variant="secondary" onclick={() => (parseError = '')}>Close</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Statements Section -->
	<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
		<div class="flex justify-between items-center mb-4">
			<h3 class="text-xl font-semibold text-white">Statements</h3>
			{#if !data.cycle.closed}
				{#if showUploadForm}
					<Button
						type="button"
						variant="secondary"
						onclick={() => {
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
							showUploadForm = true;
						}}
					>
						Upload Statement
					</Button>
				{/if}
			{/if}
		</div>

		{#if showUploadForm && !data.cycle.closed}
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
								onchange={(e) => (selectedFile = e.target.files[0])}
								class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
							/>
							<div
								class="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-300 gap-2"
							>
								<span class="truncate flex-1">
									{selectedFile ? selectedFile.name : 'Choose a PDF file...'}
								</span>
								<Button
									variant="secondary"
									size="sm"
									onclick={() => document.getElementById('pdf-file-input').click()}
									class="sm:ml-2"
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

		{#if data.statements.length === 0}
			<p class="text-gray-300">No statements uploaded yet.</p>
			<p class="text-gray-400 text-sm mt-2">
				Upload credit card statements to begin processing charges.
			</p>
		{:else}
			<div class="space-y-3">
				{#each data.statements as statement}
					{@const card = data.creditCards.find((c) => c.id === statement.credit_card_id)}
					<div class="bg-gray-700 border border-gray-600 rounded-lg p-4">
						<div
							class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
						>
							<div class="flex-1">
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
							<div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
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
	{#if data.charges.length > 0}
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
			<h3 class="text-xl font-semibold text-white mb-4">Charges ({data.charges.length})</h3>

			<!-- Mobile-friendly table -->
			<div class="block md:hidden">
				{#each data.charges as charge}
					<div class="border-b border-gray-700 py-3 last:border-b-0">
						<div class="flex justify-between items-start gap-3">
							<div class="flex-1 min-w-0">
								<div class="text-white font-medium truncate">
									{#if charge.flight_details}
										✈️ {formatMerchantName(charge)}
									{:else if charge.is_foreign_currency && formatForeignCurrency(charge)}
										{formatMerchantName(charge)} ({formatForeignCurrency(charge)})
									{:else}
										{formatMerchantName(charge)}
									{/if}
								</div>
								<div class="text-gray-400 text-sm mt-1 flex items-center gap-2">
									<span
										title={charge.transaction_date
											? formatLocalDate(charge.transaction_date)
											: formatLocalDate(charge.created_at?.split('T')[0])}
									>
										{charge.transaction_date
											? formatShortDate(charge.transaction_date)
											: formatShortDate(charge.created_at?.split('T')[0])}
									</span>
									{#if charge.card_name}
										<button
											class="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
											title={`Card: ${charge.card_name}`}
											onclick={() => showCardInfo(charge.card_name)}
										>
											💳
										</button>
									{/if}
									<!-- Allocation editing for mobile -->
									<button
										class="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
										title={`Allocation: ${charge.allocated_to || 'None'}. Click to change.`}
										disabled={updatingAllocations.has(charge.id)}
										onclick={() =>
											updateChargeAllocation(charge.id, getNextAllocation(charge.allocated_to))}
									>
										{updatingAllocations.has(charge.id)
											? '⏳'
											: getAllocationIcon(charge.allocated_to)}
									</button>
								</div>
							</div>
							<div class="text-right flex-shrink-0">
								<div class="text-white font-medium {charge.amount < 0 ? 'text-red-400' : ''}">
									{charge.amount < 0 ? '-' : ''}${Math.abs(charge.amount).toFixed(2)}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Desktop table -->
			<div class="hidden md:block overflow-x-auto">
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
						{#each data.charges as charge}
							<tr class="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
								<td class="text-gray-300 text-sm py-2">
									<span
										title={charge.transaction_date
											? formatLocalDate(charge.transaction_date)
											: formatLocalDate(charge.created_at?.split('T')[0])}
									>
										{charge.transaction_date
											? formatShortDate(charge.transaction_date)
											: formatShortDate(charge.created_at?.split('T')[0])}
									</span>
								</td>
								<td class="text-white py-2">
									{#if charge.flight_details}
										✈️ {formatMerchantName(charge)}
									{:else if charge.is_foreign_currency && formatForeignCurrency(charge)}
										{formatMerchantName(charge)} ({formatForeignCurrency(charge)})
									{:else}
										{formatMerchantName(charge)}
									{/if}
								</td>
								<td class="text-gray-300 text-sm py-2">
									{#if charge.card_name}
										<span title={`Card: ${charge.card_name}`}>
											{charge.card_name}
										</span>
									{/if}
								</td>
								<td class="text-gray-300 text-sm py-2">
									<!-- Allocation editing for desktop -->
									<button
										class="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
										title={`Allocation: ${charge.allocated_to || 'None'}. Click to change.`}
										disabled={updatingAllocations.has(charge.id)}
										onclick={() =>
											updateChargeAllocation(charge.id, getNextAllocation(charge.allocated_to))}
									>
										{updatingAllocations.has(charge.id)
											? '⏳'
											: getAllocationIcon(charge.allocated_to)}
									</button>
								</td>
								<td class="text-right py-2">
									<span class="text-white font-medium {charge.amount < 0 ? 'text-red-400' : ''}">
										{charge.amount < 0 ? '-' : ''}${Math.abs(charge.amount).toFixed(2)}
									</span>
								</td>
								<td class="text-gray-300 text-sm py-2">
									<!-- Currency column - now integrated into merchant name -->
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Card Details Modal for Mobile -->
	{#if showCardDetails}
		<div
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:hidden"
		>
			<div class="bg-gray-800 border border-gray-600 rounded-lg p-4 mx-4 max-w-sm w-full">
				<div class="text-center">
					<div class="text-2xl mb-2">💳</div>
					<div class="text-white font-medium">{selectedCardName}</div>
					<div class="text-gray-400 text-sm mt-1">Card Details</div>
				</div>
				<div class="mt-4 flex justify-center">
					<button
						class="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
						onclick={() => (showCardDetails = false)}
					>
						Close
					</button>
				</div>
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

<!-- Fixed Footer with Running Totals -->
{#if data.charges.length > 0}
	<div class="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-40">
		<div class="container mx-auto max-w-6xl">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="text-white font-medium">Running Totals:</div>
				<div class="flex flex-wrap items-center gap-4">
					{#each Object.entries(allocationTotals) as [allocation, total]}
						<div class="flex items-center gap-2">
							<span class="text-lg">{getAllocationIcon(allocation)}</span>
							<span class="text-gray-300 text-sm">{allocation}:</span>
							<span class="text-white font-medium {total < 0 ? 'text-red-400' : ''}">
								{total < 0 ? '-' : ''}${Math.abs(total).toFixed(2)}
							</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
