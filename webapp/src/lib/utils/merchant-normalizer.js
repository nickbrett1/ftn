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

	// Priority order is important to avoid false positives:
	// 1. Food delivery services (most specific)
	// 2. Ride sharing services (specific)
	// 3. Amazon/marketplaces (common, check BEFORE flights to avoid false positives)
	// 4. Airlines/travel (check AFTER Amazon to avoid misclassifying Amazon purchases)
	// 5. Other specific merchants
	// 6. Generic normalization

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

	// Amazon and similar marketplaces (check BEFORE flights to avoid false positives)
	if (merchantUpper.includes('AMAZON') || merchantUpper.includes('AMZN')) {
		return extractAmazonDetails(merchant);
	}

	// Airlines and travel (check AFTER Amazon to avoid misclassifying Amazon purchases)
	if (isFlightTransaction(merchantUpper)) {
		return extractFlightDetails(merchant);
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
 * More intelligent extraction that avoids false positives
 */
function extractFlightDetails(merchant) {
	const merchantUpper = merchant.toUpperCase();

	// Identify airline with more context awareness
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
	let airlineContext = '';

	// Look for airline names with better context checking
	for (const airlineName of airlines) {
		if (merchantUpper.includes(airlineName)) {
			// Additional check: make sure this isn't just a mention in product text
			// Real airline transactions usually have specific patterns
			const hasFlightContext = 
				// Airport codes
				/\b[A-Z]{3}\s*[-*]\s*[A-Z]{3}\b/.test(merchantUpper) ||
				// Flight numbers
				/\b\d{1,4}\b/.test(merchantUpper) ||
				// Flight-related words
				/\b(DEPARTURE|ARRIVAL|GATE|TERMINAL|BOARDING|FLIGHT|TICKET)\b/i.test(merchantUpper) ||
				// Credit card transaction patterns (amount, date, etc.)
				/\$\d+\.\d{2}/.test(merchantUpper);

			if (hasFlightContext) {
				airline = airlineName;
				break;
			}
		}
	}

	// Extract route information if present
	const routeMatch = merchant.match(/([A-Z]{3})\s*[-*]\s*([A-Z]{3})/i);
	const route = routeMatch ? `${routeMatch[1]}-${routeMatch[2]}` : '';

	// Only return flight classification if we're confident this is actually a flight
	if (airline && (route || /\b(FLIGHT|TICKET|DEPARTURE|ARRIVAL)\b/i.test(merchantUpper))) {
		return {
			merchant_normalized: airline,
			merchant_details: route || merchant
		};
	}

	// If we're not confident this is a flight, fall back to generic classification
	return {
		merchant_normalized: normalizeGenericMerchant(merchant),
		merchant_details: merchant
	};
}

/**
 * Extract Amazon details
 */
function extractAmazonDetails(merchant) {
	const merchantUpper = merchant.toUpperCase();

	// Check for specific Amazon services
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
 * More intelligent detection that avoids false positives from Amazon purchases
 */
function isFlightTransaction(merchantUpper) {
	// Strong flight indicators that are unlikely to appear in regular purchases
	const strongFlightIndicators = [
		'FLIGHT',
		'AIRLINE',
		'AIRWAYS',  // Added AIRWAYS to catch "JETBLUE AIRWAYS"
		'AIRPORT',
		'TICKET',
		'TRAVEL',
		'HOTEL',
		'CAR RENTAL',
		'TRANSPORTATION'
	];

	// Check for strong flight indicators
	const hasStrongIndicator = strongFlightIndicators.some((indicator) => 
		merchantUpper.includes(indicator)
	);

	// If we have a strong indicator, do additional checks to avoid false positives
	if (hasStrongIndicator) {
		// Check if this might actually be an Amazon purchase (which should take precedence)
		if (merchantUpper.includes('AMAZON') || merchantUpper.includes('AMZN')) {
			return false; // This is likely an Amazon purchase, not a flight
		}

		// Check if this looks like a real flight transaction
		// Real flight transactions typically have specific patterns
		const hasFlightPattern = 
			// Airport codes (3-letter codes like JFK, LAX)
			/\b[A-Z]{3}\s*[-*]\s*[A-Z]{3}\b/.test(merchantUpper) ||
			// Flight numbers (typically 1-4 digits)
			/\b\d{1,4}\b/.test(merchantUpper) ||
			// Common flight-related words
			/\b(DEPARTURE|ARRIVAL|GATE|TERMINAL|BOARDING)\b/i.test(merchantUpper) ||
			// Price patterns (common in flight transactions)
			/\$\d+\.\d{2}/.test(merchantUpper);

		return hasFlightPattern;
	}

	// Also check for airline names even without strong indicators
	// This catches cases like "JETBLUE JFK-LAX" without needing "AIRWAYS"
	const airlines = [
		'UNITED', 'AMERICAN', 'DELTA', 'SOUTHWEST', 'JETBLUE', 
		'SPIRIT', 'FRONTIER', 'ALASKA', 'BRITISH AIRWAYS', 
		'LUFTHANSA', 'AIR CANADA', 'EMIRATES', 'QATAR'
	];
	
	const hasAirlineName = airlines.some(airline => merchantUpper.includes(airline));
	if (hasAirlineName) {
		// Check if this might actually be an Amazon purchase (which should take precedence)
		if (merchantUpper.includes('AMAZON') || merchantUpper.includes('AMZN')) {
			return false; // This is likely an Amazon purchase, not a flight
		}

		// Check for flight context
		const hasFlightContext = 
			// Airport codes (3-letter codes like JFK, LAX)
			/\b[A-Z]{3}\s*[-*]\s*[A-Z]{3}\b/.test(merchantUpper) ||
			// Price patterns
			/\$\d+\.\d{2}/.test(merchantUpper) ||
			// Flight-related words
			/\b(FLIGHT|TICKET|DEPARTURE|ARRIVAL|GATE|TERMINAL|BOARDING)\b/i.test(merchantUpper);

		return hasFlightContext;
	}

	return false;
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
