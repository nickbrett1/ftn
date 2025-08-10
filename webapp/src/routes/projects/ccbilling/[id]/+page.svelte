<script>
	import Button from '$lib/components/Button.svelte';
	import { getAllocationIcon, getNextAllocation } from '$lib/utils/budget-icons.js';
	import tippy from 'tippy.js';
	import 'tippy.js/dist/tippy.css';
	import { onMount } from 'svelte';
	import { onDestroy } from 'svelte';
	import LinkifyIt from 'linkify-it';

	/** @type {import('./$types').PageProps} */
	let { data } = $props();

	// Create a local reactive copy of the data for mutations
	let localData = $state({
		...data,
		charges: [...data.charges]
	});

	// Update localData when data prop changes (e.g., after invalidate())
	$effect(() => {
		localData.cycleId = data.cycleId;
		localData.cycle = data.cycle;
		localData.statements = data.statements;
		localData.charges = [...data.charges];
		localData.creditCards = data.creditCards;
		localData.budgets = data.budgets;
	});

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

	// Merchant info state
	let showMerchantInfo = $state(false);
	let merchantInfoLoading = $state(false);
	let merchantInfoError = $state('');
	let merchantInfoData = $state(null);

	// Check if any charges exist for a statement
	function hasChargesForStatement(statementId) {
		return localData.charges.some((charge) => charge.statement_id === statementId);
	}

	// Credit card filter state
	let selectedCardFilter = $state('all'); // 'all' or credit card ID

	// Filtered charges based on selected card
	function getFilteredCharges() {
		return selectedCardFilter === 'all' 
			? localData.charges 
			: localData.charges.filter(charge => charge.credit_card_id === parseInt(selectedCardFilter));
	}

	// Card info display state
	let showCardDetails = $state(false);
	let selectedCardName = $state('');

	function showCardInfo(cardName) {
		selectedCardName = cardName;
		showCardDetails = true;
	}

	// Filtered running totals
	function getFilteredAllocationTotals() {
		const totals = {};
		
		getFilteredCharges().forEach(charge => {
			const allocation = charge.allocated_to || '__unallocated__';
			totals[allocation] = (totals[allocation] || 0) + charge.amount;
		});
		
		return Object.entries(totals).sort(([,a], [,b]) => b - a);
	}

	const linkify = new LinkifyIt();
	function toSegments(text) {
		if (!text) return [];
		const segments = [];
		let last = 0;
		const matches = linkify.match(text) || [];
		for (const m of matches) {
			if (m.index > last) segments.push({ type: 'text', text: text.slice(last, m.index) });
			segments.push({ type: 'link', text: m.text, href: m.url });
			last = m.lastIndex;
		}
		if (last < text.length) segments.push({ type: 'text', text: text.slice(last) });
		return segments;
	}

	async function openMerchantInfo(chargeId) {
		merchantInfoLoading = true;
		merchantInfoError = '';
		merchantInfoData = null;
		showMerchantInfo = true;
		try {
			const res = await fetch(`/projects/ccbilling/charges/${chargeId}/merchant-info`);
			const isOk = res.ok;
			const data = await res.json().catch(() => ({}));
			if (!isOk) {
				throw new Error(data.error || `Failed to fetch merchant info (status ${res.status})`);
			}

			// Accept both {merchant, text} and error-shaped payloads for robustness
			if (data && typeof data.text === 'string' && data.text.trim().length > 0) {
				merchantInfoData = data;
			} else if (data && data.error) {
				merchantInfoError = data.error;
			} else {
				// Fallback to empty text if nothing usable
				merchantInfoData = { merchant: data.merchant || '', text: '' };
			}
		} catch (e) {
			merchantInfoError = e.message;
		} finally {
			merchantInfoLoading = false;
		}
	}

	// Allocation editing state - removed loading state to fix click issues
	// Removed recentlyUpdated state as it was causing UI issues

	// Calculate running totals and sort them
	function getSortedAllocationTotals() {
		const totals = localData.charges.reduce((totals, charge) => {
			// Use a special key for unallocated items to avoid null key conversion issues
			const allocation = charge.allocated_to || '__unallocated__';
			if (!totals[allocation]) {
				totals[allocation] = 0;
			}
			totals[allocation] += charge.amount;
			return totals;
		}, {});

		const entries = Object.entries(totals);
		return entries.sort(([a], [b]) => {
			// Always put unallocated first
			if (a === '__unallocated__') return -1;
			if (b === '__unallocated__') return 1;
			// Then sort budgets alphabetically
			return a.localeCompare(b);
		});
	}

	// Get budget names for allocation options (including null for unallocated)
	let budgetNames = $derived(localData.budgets.map((b) => b.name));

	// Determine if we should use radio buttons (for small number of budgets)
	let shouldUseRadioButtons = $derived(localData.budgets.length <= 5);

	// Function to check if a statement has been parsed (has associated charges)
	function isStatementParsed(statementId) {
		return localData.charges.some((charge) => charge.statement_id === statementId);
	}

	async function updateChargeAllocation(chargeId, newAllocation) {
		// Immediately perform the update without debouncing
		await performAllocationUpdate(chargeId, newAllocation);
	}

	async function performAllocationUpdate(chargeId, newAllocation) {
		// Find the charge and store the previous allocation for rollback
		const charge = localData.charges.find((c) => c.id === chargeId);
		const previousAllocation = charge.allocated_to;

		// Optimistic update - update UI immediately
		const chargeIndex = localData.charges.findIndex((c) => c.id === chargeId);
		if (chargeIndex !== -1) {
			// Create a new array to ensure reactivity
			localData.charges = localData.charges.map((c, index) =>
				index === chargeIndex ? { ...c, allocated_to: newAllocation } : c
			);
		}

		try {
			const response = await fetch(`/projects/ccbilling/charges/${chargeId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					merchant: charge.merchant,
					amount: charge.amount,
					allocated_to: newAllocation
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update allocation');
			}

			// Success - no need to update UI again since we already did
		} catch (error) {
			console.error('Error updating allocation:', error);

			// Rollback the optimistic update on error
			if (chargeIndex !== -1) {
				localData.charges = localData.charges.map((c, index) =>
					index === chargeIndex ? { ...c, allocated_to: previousAllocation } : c
				);
			}

			// Removed visual feedback cleanup

			// Show error to user
			alert(`Failed to update allocation: ${error.message}`);
		} finally {
			// Loading state is cleared by timeout
		}
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

	onMount(() => {
		// Initialize tooltips for allocation buttons
		tippy('[data-allocation-tooltip]', {
			content: (reference) => reference.getAttribute('data-allocation-tooltip'),
			placement: 'top'
		});
	});

	onDestroy(() => {
		// Cleanup when component unmounts
	});
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
			<Button href="/projects/ccbilling" variant="secondary" size="sm">
				Back to Billing Cycles
			</Button>
			<Button
				variant="secondary"
				size="sm"
				onclick={async () => {
					try {
						const res = await fetch(`/projects/ccbilling/cycles/${data.cycleId}/charges`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ refresh: 'auto-associations' })
						});
						if (!res.ok) {
							const e = await res.json().catch(() => ({}));
							throw new Error(e.error || 'Failed to refresh auto-associations');
						}
						await invalidate(`cycle-${data.cycleId}`);
					} catch (err) {
						alert(err.message);
					}
				}}
			>
				Refresh Auto-Associations
			</Button>
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
		</div>

		{#if showUploadForm}
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
								{#if !isStatementParsed(statement.id)}
									<Button
										type="button"
										variant="success"
										size="sm"
										disabled={parsingStatements.has(statement.id)}
										onclick={() => parseStatement(statement.id)}
									>
										{#if parsingStatements.has(statement.id)}
											<div class="flex items-center space-x-2">
												<div
													class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"
												></div>
												<span>Parsing...</span>
											</div>
										{:else}
											Parse
										{/if}
									</Button>
								{:else}
									<div
										class="text-green-400 text-sm font-medium px-3 py-1 bg-green-900/20 border border-green-700 rounded"
									>
										✓ Parsed
									</div>
								{/if}
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
	{#if localData.charges.length > 0}
		<div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
			<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
				<div class="flex items-center gap-3">
					<h3 class="text-xl font-semibold text-white">
						Charges ({getFilteredCharges().length} of {localData.charges.length})
					</h3>
					{#if selectedCardFilter !== 'all'}
						<div class="text-blue-400 text-sm bg-blue-900/20 border border-blue-700 rounded px-2 py-1">
							Filtered by: {localData.creditCards.find(card => card.id === parseInt(selectedCardFilter))?.name}
						</div>
					{/if}
				</div>
				
				<!-- Credit Card Filter -->
				<div class="flex items-center gap-3">
					<label for="card-filter" class="text-gray-300 text-sm font-medium">Filter by card:</label>
					<div class="flex items-center gap-2">
						<select
							id="card-filter"
							bind:value={selectedCardFilter}
							class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
						>
							<option value="all">All Cards</option>
							{#each localData.creditCards as card}
								<option value={card.id}>{card.name} (****{card.last4})</option>
							{/each}
						</select>
						{#if selectedCardFilter !== 'all'}
							<button
								onclick={() => selectedCardFilter = 'all'}
								class="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
							>
								Clear Filter
							</button>
						{/if}
					</div>
				</div>
			</div>

			<!-- Credit Card Summary (when no filter is active) -->
			{#if selectedCardFilter === 'all' && localData.creditCards.length > 1}
				<div class="mb-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
					<h4 class="text-sm font-medium text-gray-300 mb-3">Charges by Credit Card:</h4>
					<div class="flex flex-wrap gap-3">
						{#each localData.creditCards as card}
							{@const cardCharges = localData.charges.filter(charge => charge.credit_card_id === card.id)}
							{@const cardTotal = cardCharges.reduce((sum, charge) => sum + charge.amount, 0)}
							{#if cardCharges.length > 0}
								<button
									class="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors text-sm"
									onclick={() => selectedCardFilter = card.id.toString()}
									title={`Click to filter by ${card.name}`}
								>
									<span class="text-white font-medium">{card.name}</span>
									<span class="text-gray-300">({cardCharges.length})</span>
									<span class="text-white font-medium {cardTotal < 0 ? 'text-red-400' : ''}">
										{cardTotal < 0 ? '-' : ''}${Math.abs(cardTotal).toFixed(2)}
									</span>
								</button>
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			<!-- Mobile-friendly table -->
			{#if getFilteredCharges().length > 0}
				<div class="block md:hidden">
					{#each getFilteredCharges() as charge}
						<div class="border-b border-gray-700 py-3 last:border-b-0">
							<div class="flex justify-between items-start gap-3">
								<div class="flex-1 min-w-0">
									<div class="text-white font-medium truncate">
										<button
											class="mr-2 inline-flex items-center justify-center text-green-400 hover:text-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 align-middle"
											title="More info about this merchant"
											aria-label="More info about this merchant"
											onclick={() => openMerchantInfo(charge.id)}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												class="h-5 w-5 block"
												fill="currentColor"
											>
												<path
													d="M10 2a8 8 0 1 0 .001 16.001A8 8 0 0 0 10 2Zm0 4.75a.875.875 0 1 1 0 1.75.875.875 0 0 1 0-1.75ZM9 9.5a1 1 0 1 1 2 0v4a1 1 0 1 1-2 0v-4z"
												/>
											</svg>
										</button>
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
										{#if shouldUseRadioButtons}
											<!-- Radio buttons for small number of budgets -->
											<div class="flex gap-1">
												{#each [null, ...budgetNames] as budgetOption}
													<button
														class="p-1 text-sm rounded transition-colors {charge.allocated_to ===
														budgetOption
															? 'bg-blue-600 text-white'
															: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
														data-allocation-tooltip={`Allocate to: ${budgetOption || 'Unallocated'}`}
														onclick={() => updateChargeAllocation(charge.id, budgetOption)}
													>
														{getAllocationIcon(budgetOption, localData.budgets)}
													</button>
												{/each}
											</div>
										{:else}
											<!-- Single click button for many budgets -->
											<button
												class="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
												data-allocation-tooltip={`Current: ${charge.allocated_to || 'Unallocated'}. Click to cycle through options.`}
												onclick={() =>
													updateChargeAllocation(
														charge.id,
														getNextAllocation(charge.allocated_to, localData.budgets)
													)}
											>
												{getAllocationIcon(charge.allocated_to, localData.budgets)}
											</button>
										{/if}
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
							{#each getFilteredCharges() as charge}
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
										<button
											class="mr-2 inline-flex items-center justify-center text-green-400 hover:text-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 align-middle"
											title="More info about this merchant"
											aria-label="More info about this merchant"
											onclick={() => openMerchantInfo(charge.id)}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												class="h-5 w-5 block"
												fill="currentColor"
											>
												<path
													d="M10 2a8 8 0 1 0 .001 16.001A8 8 0 0 0 10 2Zm0 4.75a.875.875 0 1 1 0 1.75.875.875 0 0 1 0-1.75ZM9 9.5a1 1 0 1 1 2 0v4a1 1 0 1 1-2 0v-4z"
												/>
											</svg>
										</button>
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
										{#if shouldUseRadioButtons}
											<!-- Radio buttons for small number of budgets -->
											<div class="flex gap-1">
												{#each [null, ...budgetNames] as budgetOption}
													<button
														class="p-1 text-sm rounded transition-colors {charge.allocated_to ===
														budgetOption
															? 'bg-blue-600 text-white'
															: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
														data-allocation-tooltip={`Allocate to: ${budgetOption || 'Unallocated'}`}
														onclick={() => updateChargeAllocation(charge.id, budgetOption)}
													>
														{getAllocationIcon(budgetOption, localData.budgets)}
													</button>
												{/each}
											</div>
										{:else}
											<!-- Single click button for many budgets -->
											<button
												class="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
												data-allocation-tooltip={`Current: ${charge.allocated_to || 'Unallocated'}. Click to cycle through options.`}
												onclick={() =>
													updateChargeAllocation(
														charge.id,
														getNextAllocation(charge.allocated_to, localData.budgets)
													)}
											>
												{getAllocationIcon(charge.allocated_to, localData.budgets)}
											</button>
										{/if}
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
			{:else if selectedCardFilter !== 'all'}
				<div class="text-center py-8">
					<div class="text-gray-400 text-lg mb-2">No charges found for this credit card</div>
					<div class="text-gray-500 text-sm mb-4">Try selecting a different card or clear the filter</div>
					<button
						onclick={() => selectedCardFilter = 'all'}
						class="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
					>
						Show All Charges
					</button>
				</div>
			{:else}
				<div class="text-center py-8">
					<div class="text-gray-400 text-lg">No charges found</div>
					<div class="text-gray-500 text-sm">Upload and parse statements to see charges</div>
				</div>
			{/if}
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

	{#if showMerchantInfo}
		<div class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
			<div class="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg w-full shadow-lg">
				<h3 class="text-lg font-bold text-white mb-4">Merchant details</h3>
				{#if merchantInfoLoading}
					<div class="text-gray-300">Fetching info...</div>
				{:else if merchantInfoError}
					<div class="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
						{merchantInfoError}
					</div>
				{:else if merchantInfoData}
					<div class="space-y-3">
						<div class="text-gray-300 text-sm">
							Searched: <span class="text-white">{merchantInfoData.merchant}</span>
						</div>
						{#if merchantInfoData.text}
							<div class="prose prose-invert max-w-none">
								<p class="whitespace-pre-wrap text-gray-200 text-sm">
									{#each toSegments(merchantInfoData.text) as seg}
										{#if seg.type === 'text'}{seg.text}{:else}
											<a href={seg.href} target="_blank" rel="noopener noreferrer nofollow" class="underline text-blue-400 hover:text-blue-300">{seg.text}</a>
										{/if}
									{/each}
								</p>
							</div>
						{:else}
							<div class="text-gray-300">No info available.</div>
						{/if}
					</div>
				{:else}
					<div class="text-gray-300">No info available.</div>
				{/if}
				<div class="flex justify-end gap-2 mt-6">
					<button
						class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
						onclick={() => {
							showMerchantInfo = false;
						}}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Fixed Footer with Running Totals -->
{#if localData.charges.length > 0}
	<div class="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-40">
		<div class="container mx-auto max-w-6xl">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<div class="text-white font-medium">Running Totals:</div>
					{#if selectedCardFilter !== 'all'}
						<div class="text-blue-400 text-sm bg-blue-900/20 border border-blue-700 rounded px-2 py-1">
							Filtered by: {localData.creditCards.find(card => card.id === parseInt(selectedCardFilter))?.name}
						</div>
					{/if}
				</div>
				<div class="flex flex-wrap items-center gap-4">
					{#each getFilteredAllocationTotals() as [allocation, total]}
						<div class="flex items-center gap-2">
							<span class="text-lg"
								>{getAllocationIcon(
									allocation === '__unallocated__' ? null : allocation,
									localData.budgets
								)}</span
							>
							<span class="text-gray-300 text-sm"
								>{allocation === '__unallocated__' ? 'Unallocated' : allocation}:</span
							>
							<span class="text-white font-medium {total < 0 ? 'text-red-400' : ''}">
								{total < 0 ? '-' : ''}${Math.abs(total).toFixed(2)}
							</span>
						</div>
					{/each}
					{#if selectedCardFilter !== 'all'}
						<div class="text-gray-400 text-sm border-l border-gray-600 pl-4">
							Total: ${getFilteredCharges().reduce((sum, charge) => sum + charge.amount, 0).toFixed(2)}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
