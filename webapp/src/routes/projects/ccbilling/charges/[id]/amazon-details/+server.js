import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';
import { getPayment } from '$lib/server/ccbilling-db.js';
import {
	extractAmazonOrderId,
	getAmazonOrderInfo,
	getCachedAmazonOrder,
	cacheAmazonOrder,
	categorizeAmazonItems
} from '$lib/server/amazon-orders-service.js';

/**
 * GET /projects/ccbilling/charges/[id]/amazon-details
 * Get Amazon order information and click-out links for a specific charge
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

	// Check cache first for any existing data
	let cachedOrder = await getCachedAmazonOrder(event, orderId);
	
	// Generate Amazon order information with click-out links
	const orderInfo = getAmazonOrderInfo(orderId);

	// If we have cached data, merge it with the order info
	if (cachedOrder) {
		orderInfo.cached_data = cachedOrder;
		orderInfo.cache_source = 'database';
	} else {
		orderInfo.cache_source = 'none';
	}

	// Add category suggestions if we have cached items
	let categories = {};
	if (cachedOrder?.items && cachedOrder.items.length > 0) {
		categories = categorizeAmazonItems(cachedOrder.items);
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
		order_info: orderInfo,
		suggested_categories: categories,
		message: 'Click the Amazon order link above to view your order details on Amazon'
	});
}

/**
 * POST /projects/ccbilling/charges/[id]/amazon-details
 * Manually trigger a refresh of Amazon order information
 */
export async function POST(event) {
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
				merchant: charge.merchant
			},
			{ status: 404 }
		);
	}

	// Generate fresh Amazon order information
	const orderInfo = getAmazonOrderInfo(orderId);
	orderInfo.refreshed_at = new Date().toISOString();

	return json({
		success: true,
		message: 'Amazon order information refreshed',
		order_id: orderId,
		order_info: orderInfo
	});
}
