/**
 * Amazon Orders Service
 * Integrates with the Amazon Orders Worker to fetch detailed order information
 * for Amazon charges found in credit card statements
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
 * Fetch order details from Amazon Orders Worker
 * @param {import('@sveltejs/kit').RequestEvent} event - SvelteKit request event
 * @param {string} orderId - Amazon order ID
 * @returns {Promise<Object|null>} - Order details or null
 */
export async function fetchAmazonOrderDetails(event, orderId) {
	const env = event.platform?.env;
	if (!env) return null;

	// Get the Amazon Orders Worker URL from environment
	const workerUrl = env.AMAZON_ORDERS_WORKER_URL || 'http://localhost:8787';

	try {
		const response = await fetch(`${workerUrl}/order/${orderId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				// Add authentication if needed
				...(env.AMAZON_ORDERS_API_KEY
					? {
							Authorization: `Bearer ${env.AMAZON_ORDERS_API_KEY}`
						}
					: {})
			}
		});

		if (!response.ok) {
			console.error(`Failed to fetch Amazon order ${orderId}: ${response.status}`);
			return null;
		}

		const data = await response.json();
		if (data.success && data.data) {
			return data.data;
		}

		return null;
	} catch (error) {
		console.error('Error fetching Amazon order details:', error);
		return null;
	}
}

/**
 * Process multiple Amazon charges and fetch their order details
 * @param {import('@sveltejs/kit').RequestEvent} event - SvelteKit request event
 * @param {Array} charges - Array of charge objects with merchant strings
 * @returns {Promise<Array>} - Charges enhanced with order details
 */
export async function enrichAmazonCharges(event, charges) {
	if (!charges || charges.length === 0) return charges;

	const env = event.platform?.env;
	if (!env) return charges;

	const workerUrl = env.AMAZON_ORDERS_WORKER_URL || 'http://localhost:8787';

	// Extract Amazon charges and their order IDs
	const amazonCharges = charges
		.map((charge, index) => ({
			...charge,
			originalIndex: index,
			orderId: extractAmazonOrderId(charge.merchant)
		}))
		.filter((charge) => charge.orderId);

	if (amazonCharges.length === 0) return charges;

	try {
		// Batch request to the worker
		const response = await fetch(`${workerUrl}/bulk`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(env.AMAZON_ORDERS_API_KEY
					? {
							Authorization: `Bearer ${env.AMAZON_ORDERS_API_KEY}`
						}
					: {})
			},
			body: JSON.stringify({
				merchants: amazonCharges.map((c) => c.merchant),
				fetch_details: true
			})
		});

		if (!response.ok) {
			console.error(`Failed to fetch Amazon orders in bulk: ${response.status}`);
			return charges;
		}

		const data = await response.json();
		if (!data.success || !data.results) return charges;

		// Create a map of enhanced charges
		const enhancedMap = new Map();
		data.results.forEach((result, i) => {
			if (result.order_details && !result.order_details.error) {
				const originalCharge = amazonCharges[i];
				enhancedMap.set(originalCharge.originalIndex, {
					...originalCharge,
					amazon_order: result.order_details
				});
			}
		});

		// Merge enhanced data back into original charges array
		return charges.map((charge, index) => {
			if (enhancedMap.has(index)) {
				return enhancedMap.get(index);
			}
			return charge;
		});
	} catch (error) {
		console.error('Error enriching Amazon charges:', error);
		return charges;
	}
}

/**
 * Get cached Amazon order details from D1 database
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
 * Save Amazon order details to D1 database cache
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
