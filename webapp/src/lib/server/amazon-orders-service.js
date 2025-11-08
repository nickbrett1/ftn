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

	// Pattern for D01 format order IDs (D01-XXXXXXX-XXXXXXX)
	const d01Pattern = /\b(D01-\d{7}-\d{7})\b/;
	match = merchantString.match(d01Pattern);
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
	const lines = statementText
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	// Check if any line contains Amazon identifiers
	const hasAmazon = lines.some(
		(line) => line.toUpperCase().includes('AMAZON') || line.toUpperCase().includes('AMZN')
	);

	if (!hasAmazon) return null;

	// Look for order ID patterns across all lines
	for (const line of lines) {
		// Pattern for standard Amazon order IDs (XXX-XXXXXXX-XXXXXXX)
		const standardPattern = /\b(\d{3}-\d{7}-\d{7})\b/;
		let match = line.match(standardPattern);
		if (match) return match[1];

		// Pattern for D01 format order IDs (D01-XXXXXXX-XXXXXXX)
		const d01Pattern = /\b(D01-\d{7}-\d{7})\b/;
		match = line.match(d01Pattern);
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
 * Get Amazon order information for display
 * @param {string} orderId - Amazon order ID
 * @returns {Object} - Order information with click-out link
 */
export function getAmazonOrderInfo(orderId) {
	if (!orderId) return null;

	return {
		order_id: orderId,
		order_url: generateAmazonOrderUrl(orderId),
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
	return charges.map((charge) => {
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
