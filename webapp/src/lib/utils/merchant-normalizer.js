/**
 * Merchant Normalization Utility
 *
 * This utility normalizes merchant names to create unified identifiers
 * while preserving detailed information for budget categorization.
 */

/**
 * Normalize a merchant name to create a unified identifier
 * @param {string} merchant - Original merchant name from statement
 * @returns {Object} - Object with normalized merchant and details
 */
export function normalizeMerchant(merchant) {
	if (!merchant || typeof merchant !== 'string') {
		return {
			merchant_normalized: 'UNKNOWN',
			merchant_details: merchant || ''
		};
	}

	const merchantUpper = merchant.toUpperCase().trim();

	// Food delivery services
	if (
		merchantUpper.includes('CAVIAR') ||
		merchantUpper.includes('DOORDASH') ||
		merchantUpper.includes('UBER EATS')
	) {
		return extractFoodDeliveryDetails(merchant);
	}

	// Ride sharing services
	if (merchantUpper.includes('LYFT') || merchantUpper.includes('UBER')) {
		return extractRideSharingDetails(merchant);
	}

	// Airlines and travel
	if (isFlightTransaction(merchantUpper)) {
		return extractFlightDetails(merchant);
	}

	// Amazon and similar marketplaces
	if (merchantUpper.includes('AMAZON') || merchantUpper.includes('AMZN')) {
		return extractAmazonDetails(merchant);
	}

	// Kindle services
	if (merchantUpper.includes('KINDLE')) {
		return extractKindleDetails(merchant);
	}

	// MAIDMARINES cleaning service
	if (merchantUpper.includes('MAIDMARINES')) {
		return extractMaidMarinesDetails(merchant);
	}

	// JACADI clothing store
	if (merchantUpper.includes('JACADI')) {
		return extractJacadiDetails(merchant);
	}

	// Default: return as-is with minimal normalization
	return {
		merchant_normalized: normalizeGenericMerchant(merchant),
		merchant_details: ''
	};
}

/**
 * Extract food delivery details
 */
function extractFoodDeliveryDetails(merchant) {
	const merchantUpper = merchant.toUpperCase();

	if (merchantUpper.includes('CAVIAR')) {
		// Extract restaurant name from Caviar transactions
		const restaurantMatch = merchant.match(/CAVIAR\s*[-*]\s*(.+)/i);
		return {
			merchant_normalized: 'CAVIAR',
			merchant_details: restaurantMatch ? restaurantMatch[1].trim() : ''
		};
	}

	if (merchantUpper.includes('DOORDASH')) {
		const restaurantMatch = merchant.match(/DOORDASH\s*[-*]\s*(.+)/i);
		return {
			merchant_normalized: 'DOORDASH',
			merchant_details: restaurantMatch ? restaurantMatch[1].trim() : ''
		};
	}

	if (merchantUpper.includes('UBER EATS')) {
		const restaurantMatch = merchant.match(/UBER\s*EATS\s*[-*]\s*(.+)/i);
		return {
			merchant_normalized: 'UBER EATS',
			merchant_details: restaurantMatch ? restaurantMatch[1].trim() : ''
		};
	}

	return {
		merchant_normalized: 'FOOD DELIVERY',
		merchant_details: merchant
	};
}

/**
 * Extract ride sharing details
 */
function extractRideSharingDetails(merchant) {
	const merchantUpper = merchant.toUpperCase();

	if (merchantUpper.includes('LYFT')) {
		// Extract location or trip details
		const detailsMatch = merchant.match(/LYFT\s*[-*]\s*(.+)/i);
		return {
			merchant_normalized: 'LYFT',
			merchant_details: detailsMatch ? detailsMatch[1].trim() : ''
		};
	}

	if (merchantUpper.includes('UBER') && !merchantUpper.includes('UBER EATS')) {
		const detailsMatch = merchant.match(/UBER\s*[-*]\s*(.+)/i);
		return {
			merchant_normalized: 'UBER',
			merchant_details: detailsMatch ? detailsMatch[1].trim() : ''
		};
	}

	return {
		merchant_normalized: 'RIDE SHARING',
		merchant_details: merchant
	};
}

/**
 * Extract flight details
 */
function extractFlightDetails(merchant) {
	const merchantUpper = merchant.toUpperCase();

	// Identify airline
	const airlines = [
		'UNITED',
		'AMERICAN',
		'DELTA',
		'SOUTHWEST',
		'JETBLUE',
		'SPIRIT',
		'FRONTIER',
		'ALASKA',
		'BRITISH AIRWAYS',
		'LUFTHANSA',
		'AIR CANADA',
		'EMIRATES',
		'QATAR'
	];

	let airline = null;
	for (const airlineName of airlines) {
		if (merchantUpper.includes(airlineName)) {
			airline = airlineName;
			break;
		}
	}

	// Extract route information if present
	const routeMatch = merchant.match(/([A-Z]{3})\s*[-*]\s*([A-Z]{3})/i);
	const route = routeMatch ? `${routeMatch[1]}-${routeMatch[2]}` : '';

	return {
		merchant_normalized: airline || 'AIRLINE',
		merchant_details: route || merchant
	};
}

/**
 * Extract Amazon details
 */
function extractAmazonDetails(merchant) {
	const merchantUpper = merchant.toUpperCase();

	// First check if this contains an order ID - if so, it's a purchase, not a service
	const hasOrderId = /\b(\d{3}-\d{7}-\d{7})\b|\b(\d{16})\b|\b(\d{10,})\b/.test(merchant);
	
	// If it has an order ID, it's a purchase, not a service
	if (hasOrderId) {
		return {
			merchant_normalized: 'AMAZON',
			merchant_details: ''
		};
	}

	// Check for specific Amazon services (only if no order ID found)
	if (merchantUpper.includes('AMAZON PRIME')) {
		return {
			merchant_normalized: 'AMAZON PRIME',
			merchant_details: ''
		};
	}

	if (merchantUpper.includes('AMAZON FRESH') || merchantUpper.includes('WHOLE FOODS')) {
		return {
			merchant_normalized: 'AMAZON FRESH',
			merchant_details: ''
		};
	}

	// Default Amazon purchase
	return {
		merchant_normalized: 'AMAZON',
		merchant_details: ''
	};
}

/**
 * Extract Kindle details
 */
function extractKindleDetails(merchant) {
	// Clean up Kindle merchant name by removing service identifiers and phone numbers
	let cleanedMerchant = merchant
		.replace(/KINDLE\s+SVCS\*[A-Z0-9]+/i, 'KINDLE') // Remove service identifier like "N60LH2CQ0"
		.replace(/\d{3}-\d{3}-\d{4}/g, '') // Remove phone numbers like "888-802-3080"
		.replace(/\s+[A-Z]{2}\s*$/i, '') // Remove state codes like "WA"
		.replace(/\s+$/g, '') // Remove trailing whitespace
		.trim();

	return {
		merchant_normalized: 'KINDLE',
		merchant_details: cleanedMerchant || ''
	};
}

/**
 * Extract MAIDMARINES details
 */
function extractMaidMarinesDetails(merchant) {
	// Clean up MAIDMARINES merchant name by removing location identifiers and state codes
	let cleanedMerchant = merchant
		.replace(/MAIDMARINES\s+#\d+/i, 'MAIDMARINES') // Remove location number like "#1861813"
		.replace(/MAIDMARINES\.C/i, 'MAIDMARINES') // Remove ".C" suffix
		.replace(/\s+[A-Z]{2}\s*$/i, '') // Remove state codes like "NY"
		.replace(/\s+$/g, '') // Remove trailing whitespace
		.trim();

	return {
		merchant_normalized: 'MAIDMARINES',
		merchant_details: cleanedMerchant || ''
	};
}

/**
 * Extract JACADI details
 */
function extractJacadiDetails(merchant) {
	// Clean up JACADI merchant name by removing store numbers and location information
	let cleanedMerchant = merchant
		.replace(/JACADI\s+#\d+/i, 'JACADI') // Remove store number like "#1710"
		.replace(/\s+NEW\s+YORK/i, '') // Remove "NEW YORK" location
		.replace(/\s+[A-Z]{2}\s*$/i, '') // Remove state codes like "NY"
		.replace(/\s+$/g, '') // Remove trailing whitespace
		.trim();

	return {
		merchant_normalized: 'JACADI',
		merchant_details: cleanedMerchant || ''
	};
}

/**
 * Check if transaction is a flight
 */
function isFlightTransaction(merchantUpper) {
	const flightIndicators = [
		'FLIGHT',
		'AIRLINE',
		'AIRPORT',
		'TICKET',
		'TRAVEL',
		'HOTEL',
		'CAR RENTAL',
		'TRANSPORTATION'
	];

	// Check for generic flight indicators
	if (flightIndicators.some((indicator) => merchantUpper.includes(indicator))) {
		return true;
	}

	// Check for specific airline names
	const airlines = [
		'UNITED',
		'AMERICAN',
		'DELTA',
		'SOUTHWEST',
		'JETBLUE',
		'SPIRIT',
		'FRONTIER',
		'ALASKA',
		'BRITISH AIRWAYS',
		'LUFTHANSA',
		'AIR CANADA',
		'EMIRATES',
		'QATAR'
	];

	return airlines.some((airline) => merchantUpper.includes(airline));
}

/**
 * Normalize generic merchant names
 */
function normalizeGenericMerchant(merchant) {
	// Remove common prefixes/suffixes
	let normalized = merchant
		.replace(/^THE\s+/i, '')
		.replace(/\s+LLC$/i, '')
		.replace(/\s+INC$/i, '')
		.replace(/\s+CORP$/i, '')
		.replace(/\s+CO$/i, '')
		.trim();

	// Remove location suffixes (common patterns)
	normalized = normalized.replace(/\s+[A-Z]{2}\s*$/i, ''); // Remove state codes
	normalized = normalized.replace(/\s+[0-9]{5}\s*$/i, ''); // Remove ZIP codes

	return normalized || merchant;
}
