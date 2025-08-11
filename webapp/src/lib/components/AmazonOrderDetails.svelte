<script>
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';

	export let chargeId;
	export let merchant = '';

	let loading = false;
	let error = null;
	let orderDetails = null;
	let showDetails = false;
	let refreshing = false;

	// Check if this is an Amazon charge
	$: isAmazon =
		merchant?.toUpperCase().includes('AMAZON') || merchant?.toUpperCase().includes('AMZN');

	// Format currency
	function formatCurrency(value) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(value || 0);
	}

	// Format date
	function formatDate(dateString) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Fetch Amazon order details
	async function fetchOrderDetails() {
		if (!chargeId || !isAmazon) return;

		loading = true;
		error = null;

		try {
			const response = await fetch(`/projects/ccbilling/charges/${chargeId}/amazon-details`);
			const data = await response.json();

			if (data.success) {
				orderDetails = data;
				showDetails = true;
			} else {
				error = data.error || 'Failed to fetch order details';
				if (data.is_amazon && !data.order_id) {
					error = 'No order ID found in merchant description';
				}
			}
		} catch (err) {
			error = 'Network error: ' + err.message;
		} finally {
			loading = false;
		}
	}

	// Refresh order details (bypass cache)
	async function refreshOrderDetails() {
		if (!chargeId || refreshing) return;

		refreshing = true;
		error = null;

		try {
			const response = await fetch(`/projects/ccbilling/charges/${chargeId}/amazon-details`, {
				method: 'POST'
			});
			const data = await response.json();

			if (data.success) {
				orderDetails = data;
				showDetails = true;
			} else {
				error = data.error || 'Failed to refresh order details';
			}
		} catch (err) {
			error = 'Network error: ' + err.message;
		} finally {
			refreshing = false;
		}
	}

	// Auto-fetch on mount if Amazon charge
	onMount(() => {
		if (isAmazon) {
			fetchOrderDetails();
		}
	});
</script>

{#if isAmazon}
	<div class="amazon-order-details" transition:fade={{ duration: 200 }}>
		{#if !showDetails && !loading && !error}
			<button on:click={fetchOrderDetails} class="fetch-button" disabled={loading}>
				📦 View Amazon Order Details
			</button>
		{/if}

		{#if loading}
			<div class="loading">
				<div class="spinner"></div>
				<span>Fetching order details...</span>
			</div>
		{/if}

		{#if error}
			<div class="error" transition:slide>
				<span class="error-icon">⚠️</span>
				<span>{error}</span>
				<button on:click={fetchOrderDetails} class="retry-button"> Retry </button>
			</div>
		{/if}

		{#if orderDetails && showDetails}
			<div class="order-container" transition:slide>
				<div class="order-header">
					<h3>📦 Amazon Order Details</h3>
					<div class="order-meta">
						<span class="order-id">Order #{orderDetails.order_id}</span>
						{#if orderDetails.cache_source === 'database'}
							<span class="cache-badge">Cached</span>
						{/if}
						<button
							on:click={refreshOrderDetails}
							class="refresh-button"
							disabled={refreshing}
							title="Refresh order details"
						>
							{refreshing ? '⟳' : '🔄'}
						</button>
					</div>
				</div>

				{#if orderDetails.order_details}
					<div class="order-info">
						<div class="info-row">
							<span class="label">Order Date:</span>
							<span class="value">{formatDate(orderDetails.order_details.order_date)}</span>
						</div>
						<div class="info-row">
							<span class="label">Total Amount:</span>
							<span class="value amount"
								>{formatCurrency(orderDetails.order_details.total_amount)}</span
							>
						</div>
						{#if orderDetails.order_details.status}
							<div class="info-row">
								<span class="label">Status:</span>
								<span class="value status">{orderDetails.order_details.status}</span>
							</div>
						{/if}
					</div>

					{#if orderDetails.order_details.items && orderDetails.order_details.items.length > 0}
						<div class="items-section">
							<h4>Items ({orderDetails.order_details.items.length})</h4>
							<div class="items-list">
								{#each orderDetails.order_details.items as item}
									<div class="item" transition:slide>
										<div class="item-name">{item.name}</div>
										<div class="item-details">
											<span class="item-quantity">Qty: {item.quantity}</span>
											<span class="item-price">{formatCurrency(item.price)}</span>
										</div>
										{#if item.asin}
											<div class="item-meta">
												<span class="asin">ASIN: {item.asin}</span>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if orderDetails.suggested_categories && Object.keys(orderDetails.suggested_categories).length > 0}
						<div class="categories-section">
							<h4>Suggested Budget Categories</h4>
							<div class="categories-list">
								{#each Object.entries(orderDetails.suggested_categories) as [category, data]}
									<div class="category">
										<span class="category-name">{category}</span>
										<span class="category-amount">{formatCurrency(data.total)}</span>
										<span class="category-items">({data.items.length} items)</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/if}

				<button on:click={() => (showDetails = false)} class="close-button"> Close Details </button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.amazon-order-details {
		margin-top: 1rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #dee2e6;
	}

	.fetch-button {
		background: #ff9900;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s;
	}

	.fetch-button:hover:not(:disabled) {
		background: #e88800;
	}

	.fetch-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.loading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #6c757d;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid #f3f3f3;
		border-top: 2px solid #ff9900;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #fff3cd;
		border: 1px solid #ffc107;
		border-radius: 4px;
		color: #856404;
	}

	.error-icon {
		font-size: 1.2rem;
	}

	.retry-button {
		margin-left: auto;
		padding: 0.25rem 0.5rem;
		background: white;
		border: 1px solid #856404;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.order-container {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.order-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid #f0f0f0;
	}

	.order-header h3 {
		margin: 0;
		color: #333;
		font-size: 1.25rem;
	}

	.order-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.order-id {
		font-family: monospace;
		font-size: 0.875rem;
		color: #6c757d;
	}

	.cache-badge {
		padding: 0.125rem 0.5rem;
		background: #e7f3ff;
		color: #0066cc;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.refresh-button {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1.2rem;
		padding: 0.25rem;
		transition: transform 0.2s;
	}

	.refresh-button:hover:not(:disabled) {
		transform: scale(1.1);
	}

	.refresh-button:disabled {
		animation: spin 1s linear infinite;
		cursor: not-allowed;
	}

	.order-info {
		margin-bottom: 1.5rem;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-bottom: 1px solid #f8f9fa;
	}

	.label {
		color: #6c757d;
		font-weight: 500;
	}

	.value {
		color: #333;
		font-weight: 600;
	}

	.amount {
		color: #28a745;
	}

	.status {
		padding: 0.125rem 0.5rem;
		background: #d4edda;
		color: #155724;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.items-section {
		margin-bottom: 1.5rem;
	}

	.items-section h4 {
		margin: 0 0 1rem 0;
		color: #495057;
		font-size: 1.1rem;
	}

	.items-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.item {
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 6px;
		border-left: 3px solid #ff9900;
	}

	.item-name {
		font-weight: 500;
		color: #333;
		margin-bottom: 0.25rem;
	}

	.item-details {
		display: flex;
		gap: 1rem;
		font-size: 0.875rem;
		color: #6c757d;
	}

	.item-quantity {
		font-weight: 500;
	}

	.item-price {
		color: #28a745;
		font-weight: 600;
	}

	.item-meta {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #868e96;
	}

	.asin {
		font-family: monospace;
	}

	.categories-section {
		margin-bottom: 1.5rem;
	}

	.categories-section h4 {
		margin: 0 0 1rem 0;
		color: #495057;
		font-size: 1.1rem;
	}

	.categories-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.category {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		background: #e7f3ff;
		border-radius: 4px;
	}

	.category-name {
		font-weight: 500;
		color: #0066cc;
		flex: 1;
	}

	.category-amount {
		font-weight: 600;
		color: #28a745;
	}

	.category-items {
		font-size: 0.875rem;
		color: #6c757d;
	}

	.close-button {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background: #6c757d;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s;
	}

	.close-button:hover {
		background: #5a6268;
	}

	/* Dark mode support */
	:global(.dark) .amazon-order-details {
		background: #1a1a1a;
		border-color: #333;
	}

	:global(.dark) .order-container {
		background: #2a2a2a;
		color: #e0e0e0;
	}

	:global(.dark) .order-header h3 {
		color: #e0e0e0;
	}

	:global(.dark) .item {
		background: #1a1a1a;
	}

	:global(.dark) .category {
		background: #1a3a52;
	}
</style>
