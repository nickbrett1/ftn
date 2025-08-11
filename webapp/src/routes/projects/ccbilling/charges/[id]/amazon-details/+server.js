import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';
import { getPayment } from '$lib/server/ccbilling-db.js';
import {
	extractAmazonOrderId,
	fetchAmazonOrderDetails,
	getCachedAmazonOrder,
	cacheAmazonOrder,
	categorizeAmazonItems
} from '$lib/server/amazon-orders-service.js';

/**
 * GET /projects/ccbilling/charges/[id]/amazon-details
 * Fetch Amazon order details for a specific charge
 */
export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const chargeId = Number.parseInt(event.params.id);
	if (Number.isNaN(chargeId)) {
		return json({ error: 'Invalid charge ID' }, { status: 400 });
	}

	// Get the charge from database
	const charge = await getPayment(event, chargeId);
	if (!charge) {
		return json({ error: 'Charge not found' }, { status: 404 });
	}

	// Extract Amazon order ID from merchant string
	const orderId = extractAmazonOrderId(charge.merchant);
	if (!orderId) {
		return json(
			{
				error: 'No Amazon order ID found',
				merchant: charge.merchant,
				is_amazon:
					charge.merchant?.toUpperCase().includes('AMAZON') ||
					charge.merchant?.toUpperCase().includes('AMZN')
			},
			{ status: 404 }
		);
	}

	// Check cache first
	let orderDetails = await getCachedAmazonOrder(event, orderId);

	if (!orderDetails) {
		// Fetch from Amazon Orders Worker
		orderDetails = await fetchAmazonOrderDetails(event, orderId);

		// Cache the result if successful
		if (orderDetails && !orderDetails.error) {
			await cacheAmazonOrder(event, orderDetails);
		}
	}

	if (!orderDetails) {
		return json(
			{
				error: 'Failed to fetch order details',
				order_id: orderId,
				merchant: charge.merchant
			},
			{ status: 502 }
		);
	}

	// Add category suggestions if we have items
	let categories = {};
	if (orderDetails.items && orderDetails.items.length > 0) {
		categories = categorizeAmazonItems(orderDetails.items);
	}

	return json({
		success: true,
		charge: {
			id: charge.id,
			merchant: charge.merchant,
			amount: charge.amount,
			date: charge.date,
			allocated_to: charge.allocated_to
		},
		order_id: orderId,
		order_details: orderDetails,
		suggested_categories: categories,
		cache_source: orderDetails.updated_at ? 'database' : 'worker'
	});
}

/**
 * POST /projects/ccbilling/charges/[id]/amazon-details
 * Manually trigger a refresh of Amazon order details
 */
export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const chargeId = Number.parseInt(event.params.id);
	if (Number.isNaN(chargeId)) {
		return json({ error: 'Invalid charge ID' }, { status: 400 });
	}

	const charge = await getPayment(event, chargeId);
	if (!charge) {
		return json({ error: 'Charge not found' }, { status: 404 });
	}

	const orderId = extractAmazonOrderId(charge.merchant);
	if (!orderId) {
		return json({ error: 'No Amazon order ID found' }, { status: 404 });
	}

	// Force refresh from worker (bypass cache)
	const orderDetails = await fetchAmazonOrderDetails(event, orderId);

	if (!orderDetails) {
		return json({ error: 'Failed to fetch order details' }, { status: 502 });
	}

	// Update cache
	if (!orderDetails.error) {
		await cacheAmazonOrder(event, orderDetails);
	}

	// Add category suggestions
	let categories = {};
	if (orderDetails.items && orderDetails.items.length > 0) {
		categories = categorizeAmazonItems(orderDetails.items);
	}

	return json({
		success: true,
		order_id: orderId,
		order_details: orderDetails,
		suggested_categories: categories,
		refreshed: true
	});
}
