/**
 * Amazon Orders Service
 * Provides Amazon order ID extraction and generates click-out links to view order data on Amazon
 */

/**
 * Extract potential Amazon order IDs from a merchant string
 * @param {string} merchantString - The merchant description from credit card statement
 * @returns {string|null} - Extracted order ID or null
 */
export function extractAmazonOrderId(merchantString) {
	if (!merchantString) return null;

	// Common Amazon merchant patterns
	const isAmazon =
		merchantString.toUpperCase().includes('AMAZON') ||
		merchantString.toUpperCase().includes('AMZN');

	if (!isAmazon) return null;

	// Pattern for standard Amazon order IDs (XXX-XXXXXXX-XXXXXXX)
	const standardPattern = /\b(\d{3}-\d{7}-\d{7})\b/;
	let match = merchantString.match(standardPattern);
	if (match) return match[1];

	// Pattern for compact order IDs (16 digits)
	const compactPattern = /\b(\d{16})\b/;
	match = merchantString.match(compactPattern);
	if (match) return match[1];

	// Try to extract any long number sequence that might be an order ID
	const numberPattern = /\b(\d{10,})\b/;
	match = merchantString.match(numberPattern);
	if (match) return match[1];

	return null;
}

/**
 * Extract Amazon order ID from multi-line statement text
 * This handles cases where the order ID is on a separate line
 * @param {string} statementText - Full statement text that may contain multiple lines
 * @returns {string|null} - Extracted order ID or null
 */
export function extractAmazonOrderIdFromMultiLine(statementText) {
	if (!statementText) return null;

	// Split into lines and look for Amazon-related content
	const lines = statementText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
	
	// Check if any line contains Amazon identifiers
	const hasAmazon = lines.some(line => 
		line.toUpperCase().includes('AMAZON') || 
		line.toUpperCase().includes('AMZN')
	);
	
	if (!hasAmazon) return null;

	// Look for order ID patterns across all lines
	for (const line of lines) {
		// Pattern for standard Amazon order IDs (XXX-XXXXXXX-XXXXXXX)
		const standardPattern = /\b(\d{3}-\d{7}-\d{7})\b/;
		let match = line.match(standardPattern);
		if (match) return match[1];

		// Pattern for compact order IDs (16 digits)
		const compactPattern = /\b(\d{16})\b/;
		match = line.match(compactPattern);
		if (match) return match[1];

		// Try to extract any long number sequence that might be an order ID
		const numberPattern = /\b(\d{10,})\b/;
		match = line.match(numberPattern);
		if (match) return match[1];
	}

	return null;
}

/**
 * Generate Amazon order URL for click-out to view order data
 * @param {string} orderId - Amazon order ID
 * @returns {string} - Amazon order URL
 */
export function generateAmazonOrderUrl(orderId) {
	if (!orderId) return null;
	
	// Standard Amazon order URL format
	return `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`;
}

/**
 * Generate Amazon order search URL as fallback
 * @param {string} orderId - Amazon order ID
 * @returns {string} - Amazon search URL
 */
export function generateAmazonSearchUrl(orderId) {
	if (!orderId) return null;
	
	// Amazon search URL as fallback
	return `https://www.amazon.com/s?k=${encodeURIComponent(orderId)}`;
}

/**
 * Get Amazon order information for display
 * @param {string} orderId - Amazon order ID
 * @returns {Object} - Order information with click-out links
 */
export function getAmazonOrderInfo(orderId) {
	if (!orderId) return null;

	return {
		order_id: orderId,
		order_url: generateAmazonOrderUrl(orderId),
		search_url: generateAmazonSearchUrl(orderId),
		message: 'Click the link above to view your order details on Amazon',
		timestamp: new Date().toISOString()
	};
}

/**
 * Process multiple Amazon charges and generate order links
 * @param {Array} charges - Array of charge objects with merchant strings
 * @returns {Array} - Charges enhanced with Amazon order information
 */
export function enrichAmazonCharges(charges) {
	if (!charges || charges.length === 0) return charges;

	// Extract Amazon charges and their order IDs
	return charges.map(charge => {
		const orderId = extractAmazonOrderId(charge.merchant);
		if (orderId) {
			return {
				...charge,
				amazon_order: getAmazonOrderInfo(orderId)
			};
		}
		return charge;
	});
}

/**
 * Get cached Amazon order details from D1 database (if any exist)
 * @param {import('@sveltejs/kit').RequestEvent} event - SvelteKit request event
 * @param {string} orderId - Amazon order ID
 * @returns {Promise<Object|null>} - Cached order details or null
 */
export async function getCachedAmazonOrder(event, orderId) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) return null;

	try {
		const result = await db
			.prepare(
				`
			SELECT * FROM amazon_orders 
			WHERE order_id = ?
			AND datetime(updated_at) > datetime('now', '-7 days')
		`
			)
			.bind(orderId)
			.first();

		if (result) {
			return {
				...result,
				items: JSON.parse(result.items || '[]')
			};
		}

		return null;
	} catch (error) {
		console.error('Error fetching cached Amazon order:', error);
		return null;
	}
}

/**
 * Save Amazon order details to D1 database cache (if needed for future use)
 * @param {import('@sveltejs/kit').RequestEvent} event - SvelteKit request event
 * @param {Object} orderData - Order details to cache
 * @returns {Promise<void>}
 */
export async function cacheAmazonOrder(event, orderData) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db || !orderData || !orderData.order_id) return;

	try {
		// Create table if not exists
		await db
			.prepare(
				`
			CREATE TABLE IF NOT EXISTS amazon_orders (
				order_id TEXT PRIMARY KEY,
				order_date TEXT,
				total_amount REAL,
				status TEXT,
				items TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`
			)
			.run();

		// Upsert order data
		await db
			.prepare(
				`
			INSERT OR REPLACE INTO amazon_orders 
			(order_id, order_date, total_amount, status, items, updated_at)
			VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		`
			)
			.bind(
				orderData.order_id,
				orderData.order_date || '',
				orderData.total_amount || 0,
				orderData.status || '',
				JSON.stringify(orderData.items || [])
			)
			.run();
	} catch (error) {
		console.error('Error caching Amazon order:', error);
	}
}

/**
 * Parse Amazon order items into budget categories
 * This uses AI or rule-based logic to categorize items
 * @param {Array} items - Array of Amazon order items
 * @returns {Object} - Suggested budget allocations
 */
export function categorizeAmazonItems(items) {
	if (!items || items.length === 0) return {};

	const categories = {};
	const categoryRules = {
		Groceries: ['food', 'grocery', 'fresh', 'produce', 'snack', 'beverage'],
		Electronics: ['electronic', 'computer', 'phone', 'tablet', 'cable', 'adapter', 'battery'],
		Home: ['home', 'furniture', 'decor', 'kitchen', 'bathroom', 'cleaning'],
		Clothing: ['clothing', 'apparel', 'shoes', 'shirt', 'pants', 'dress'],
		Books: ['book', 'kindle', 'audiobook', 'magazine'],
		Entertainment: ['game', 'movie', 'music', 'toy', 'sport'],
		Health: ['health', 'vitamin', 'supplement', 'medicine', 'medical'],
		'Personal Care': ['beauty', 'cosmetic', 'shampoo', 'soap', 'lotion'],
		Office: ['office', 'stationery', 'pen', 'paper', 'desk', 'chair'],
		Pet: ['pet', 'dog', 'cat', 'animal', 'bird', 'fish']
	};

	items.forEach((item) => {
		const itemName = (item.name || '').toLowerCase();
		let matched = false;

		// Try to match with category rules
		for (const [category, keywords] of Object.entries(categoryRules)) {
			if (keywords.some((keyword) => itemName.includes(keyword))) {
				if (!categories[category]) {
					categories[category] = {
						items: [],
						total: 0
					};
				}
				categories[category].items.push(item);
				categories[category].total += (item.price || 0) * (item.quantity || 1);
				matched = true;
				break;
			}
		}

		// Default category if no match
		if (!matched) {
			if (!categories['Miscellaneous']) {
				categories['Miscellaneous'] = {
					items: [],
					total: 0
				};
			}
			categories['Miscellaneous'].items.push(item);
			categories['Miscellaneous'].total += (item.price || 0) * (item.quantity || 1);
		}
	});

	return categories;
}
