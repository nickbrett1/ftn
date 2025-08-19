<script>
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';

	export let chargeId;
	export let merchant = '';

	let loading = false;
	let error = null;
	let orderInfo = null;
	let showDetails = false;
	let refreshing = false;
	let showAccessibilityPopup = false;
	let checkingAccessibility = false;

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

	// Check if Amazon order is accessible to the current user
	async function checkOrderAccessibility(orderUrl) {
		if (!orderUrl) return false;
		
		checkingAccessibility = true;
		
		try {
			// Make a GET request to check the actual page content
			// Amazon will serve the order history page if user can't access the specific order
			const response = await fetch(orderUrl, {
				method: 'GET',
				credentials: 'include', // Include cookies for authentication
			});
			
			if (!response.ok) {
				// If we get an error status, the order is not accessible
				showAccessibilityPopup = true;
				return false;
			}
			
			// Get the response text to check the content
			const html = await response.text();
			
			// Debug logging to help understand what we're getting
			console.log('Amazon response URL:', response.url);
			console.log('Amazon response status:', response.status);
			console.log('Amazon response content length:', html.length);
			console.log('Amazon response contains order-details:', html.includes('order-details'));
			console.log('Amazon response contains order-history:', html.includes('order-history'));
			console.log('Amazon response contains css/order-history:', html.includes('css/order-history'));
			
			// Check if we're on the specific order page or redirected to order history
			// The specific order page contains order details, while the order history page has different content
			const hasOrderSpecificContent = html.includes('order-details') || 
				html.includes('orderID=') ||
				html.includes('order-detail') ||
				html.includes('order-details-container');
			
			const isGenericListingPage = html.includes('order-history') || 
				html.includes('css/order-history') ||
				html.includes('Your Orders') ||
				html.includes('order-history-table') ||
				html.includes('order-history-container') ||
				html.includes('order-history-page');
			
			const isSpecificOrderPage = hasOrderSpecificContent && !isGenericListingPage;
			
			if (!isSpecificOrderPage) {
				showAccessibilityPopup = true;
				return false;
			}
			
			return true;
		} catch (err) {
			// If there's an error (like CORS), assume it's not accessible
			showAccessibilityPopup = true;
			return false;
		} finally {
			checkingAccessibility = false;
		}
	}

	// Handle Amazon link click
	async function handleAmazonLinkClick(event, orderUrl) {
		event.preventDefault();
		
		const isAccessible = await checkOrderAccessibility(orderUrl);
		
		if (isAccessible) {
			// Open the link in a new tab if accessible
			window.open(orderUrl, '_blank', 'noopener,noreferrer');
		}
		// If not accessible, the popup is already shown
	}

	// Fetch Amazon order information
	async function fetchOrderInfo() {
		if (!chargeId || !isAmazon) return;

		loading = true;
		error = null;

		try {
			const response = await fetch(`/projects/ccbilling/charges/${chargeId}/amazon-details`);
			const data = await response.json();

			if (data.success) {
				orderInfo = data;
				showDetails = true;
			} else {
				error = data.error || 'Failed to fetch order information';
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

	// Refresh order information
	async function refreshOrderInfo() {
		if (!chargeId || refreshing) return;

		refreshing = true;
		error = null;

		try {
			const response = await fetch(`/projects/ccbilling/charges/${chargeId}/amazon-details`, {
				method: 'POST'
			});
			const data = await response.json();

			if (data.success) {
				orderInfo = data;
				showDetails = true;
			} else {
				error = data.error || 'Failed to refresh order information';
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
			fetchOrderInfo();
		}
	});
</script>

{#if isAmazon}
	<div class="amazon-order-details" transition:fade={{ duration: 200 }}>
		{#if !showDetails && !loading && !error}
			<button on:click={fetchOrderInfo} class="fetch-button" disabled={loading}>
				📦 View Amazon Order Information
			</button>
		{/if}

		{#if loading}
			<div class="loading">
				<div class="spinner"></div>
				<span>Fetching order information...</span>
			</div>
		{/if}

		{#if error}
			<div class="error" transition:slide>
				<span class="error-icon">⚠️</span>
				<span>{error}</span>
				<button on:click={fetchOrderInfo} class="retry-button"> Retry </button>
			</div>
		{/if}

		{#if orderInfo && showDetails}
			<div class="order-container" transition:slide>
				<div class="order-header">
					<h3>📦 Amazon Order Information</h3>
					<div class="order-meta">
						<span class="order-id">Order #{orderInfo.order_id}</span>
						<button
							on:click={refreshOrderInfo}
							class="refresh-button"
							disabled={refreshing}
							title="Refresh order information"
						>
							{refreshing ? '⟳' : '🔄'}
						</button>
					</div>
				</div>

				{#if orderInfo.order_info}
					<div class="order-info">
						<div class="info-row">
							<span class="label">Order ID:</span>
							<span class="value order-id-value">{orderInfo.order_info.order_id}</span>
						</div>
						{#if orderInfo.order_info.timestamp}
							<div class="info-row">
								<span class="label">Generated:</span>
								<span class="value">{formatDate(orderInfo.order_info.timestamp)}</span>
							</div>
						{/if}
					</div>

					<div class="links-section">
						<h4>View Order Details</h4>
						<div class="links-list">
							<a
								href={orderInfo.order_info.order_url}
								class="amazon-link"
								on:click={(e) => handleAmazonLinkClick(e, orderInfo.order_info.order_url)}
							>
								🛒 View Order on Amazon
								{#if checkingAccessibility}
									<span class="checking-indicator">🔍</span>
								{/if}
							</a>
						</div>
						<p class="link-description">
							{orderInfo.order_info.message || 'Click the link above to view your order details on Amazon'}
						</p>
					</div>
				{/if}

				<button on:click={() => (showDetails = false)} class="close-button"> Close Details </button>
			</div>
		{/if}
	</div>
{/if}

<!-- Accessibility Popup -->
{#if showAccessibilityPopup}
	<div class="accessibility-popup-overlay" transition:fade={{ duration: 200 }}>
		<div class="accessibility-popup" transition:slide={{ duration: 200 }}>
			<div class="popup-header">
				<h3>⚠️ Order Not Accessible</h3>
				<button 
					class="popup-close-button" 
					on:click={() => (showAccessibilityPopup = false)}
				>
					×
				</button>
			</div>
			<div class="popup-content">
				<p>
					This Amazon order appears to be from a different account than the one you're currently logged into.
				</p>
				<p>
					<strong>Why this happens:</strong> Credit card statements may contain charges from family members, 
					business accounts, or other Amazon accounts that you don't have access to.
				</p>
				<p>
					<strong>What you can do:</strong> Try logging into the Amazon account that made this purchase, 
					or contact the person who made the charge for order details.
				</p>
			</div>
			<div class="popup-actions">
				<button 
					class="popup-close-button-secondary" 
					on:click={() => (showAccessibilityPopup = false)}
				>
					Got it
				</button>
			</div>
		</div>
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

	.order-id-value {
		font-family: monospace;
		font-size: 0.875rem;
		color: #333;
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

	.links-section {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 6px;
		border: 1px solid #e9ecef;
	}

	.links-section h4 {
		margin: 0 0 1rem 0;
		color: #495057;
		font-size: 1.1rem;
	}

	.links-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.amazon-link {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1rem;
		text-decoration: none;
		border-radius: 6px;
		font-weight: 500;
		transition: all 0.2s;
		gap: 0.5rem;
		background: #ff9900;
		color: white;
		cursor: pointer;
	}

	.checking-indicator {
		font-size: 0.9rem;
		opacity: 0.8;
	}

	.amazon-link:hover {
		background: #e88800;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(255, 153, 0, 0.3);
	}

	.link-description {
		margin: 0;
		font-size: 0.875rem;
		color: #6c757d;
		text-align: center;
		font-style: italic;
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

	:global(.dark) .links-section {
		background: #1a1a1a;
		border-color: #333;
	}

	/* Accessibility Popup Styles */
	.accessibility-popup-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.accessibility-popup {
		background: white;
		border-radius: 12px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		max-width: 500px;
		width: 90%;
		max-height: 80vh;
		overflow-y: auto;
	}

	.popup-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 1.5rem 1rem 1.5rem;
		border-bottom: 1px solid #e9ecef;
	}

	.popup-header h3 {
		margin: 0;
		color: #dc3545;
		font-size: 1.25rem;
	}

	.popup-close-button {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6c757d;
		padding: 0.25rem;
		border-radius: 4px;
		transition: background 0.2s;
	}

	.popup-close-button:hover {
		background: #f8f9fa;
	}

	.popup-content {
		padding: 1rem 1.5rem;
	}

	.popup-content p {
		margin: 0 0 1rem 0;
		line-height: 1.6;
		color: #495057;
	}

	.popup-content p:last-child {
		margin-bottom: 0;
	}

	.popup-content strong {
		color: #333;
	}

	.popup-actions {
		padding: 1rem 1.5rem 1.5rem 1.5rem;
		display: flex;
		justify-content: flex-end;
		border-top: 1px solid #e9ecef;
	}

	.popup-close-button-secondary {
		background: #6c757d;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s;
	}

	.popup-close-button-secondary:hover {
		background: #5a6268;
	}

	/* Dark mode support for popup */
	:global(.dark) .accessibility-popup {
		background: #2a2a2a;
		color: #e0e0e0;
	}

	:global(.dark) .popup-header {
		border-color: #444;
	}

	:global(.dark) .popup-content p {
		color: #c0c0c0;
	}

	:global(.dark) .popup-content strong {
		color: #e0e0e0;
	}

	:global(.dark) .popup-actions {
		border-color: #444;
	}
</style>
