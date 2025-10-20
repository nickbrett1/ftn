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

	// Hotels and accommodation
	if (isHotelTransaction(merchantUpper)) {
		return extractHotelDetails(merchant);
	}

	// Airlines and travel
	if (isFlightTransaction(merchantUpper)) {
		return extractFlightDetails(merchant);
	}

	// British Airways specific handling
	if (merchantUpper.includes('BRITISH')) {
		return extractBritishAirwaysDetails(merchant);
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

	// BLUEMERCURY beauty store
	if (merchantUpper.includes('BLUEMERCURY')) {
		return extractBluemercuryDetails(merchant);
	}

	// Google Cloud services
	if (merchantUpper.includes('GOOGLE') && merchantUpper.includes('CLOUD')) {
		return extractGoogleCloudDetails(merchant);
	}

	// PlayStation Network services
	if (merchantUpper.includes('PLAYSTATION') && merchantUpper.includes('NETWORK')) {
		return extractPlayStationNetworkDetails(merchant);
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
 * Extract British Airways details
 */
function extractBritishAirwaysDetails(merchant) {
	const merchantUpper = merchant.toUpperCase();
	
	// Check if this is a British Airways transaction
	if (merchantUpper.includes('BRITISH')) {
		// Extract any additional details from the merchant name
		// For patterns like "BRITISH AWYS1252218268543 WWW.BRITISHAI"
		// we want to normalize to "BRITISH AIRWAYS" but keep the original as details
		return {
			merchant_normalized: 'BRITISH AIRWAYS',
			merchant_details: merchant
		};
	}
	
	return {
		merchant_normalized: 'BRITISH AIRWAYS',
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
	// Look for patterns like "JFK LAX", "JFK-LAX", or "JFK*LAX"
	const routeMatch = merchant.match(/\b([A-Z]{3})\s*[-*\s]\s*([A-Z]{3})\b/i);
	const route = routeMatch ? `${routeMatch[1]}-${routeMatch[2]}` : '';

	return {
		merchant_normalized: airline || 'UNKNOWN AIRLINE',
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
	merchant
		.replace(/MAIDMARINES\s+#\d+/i, 'MAIDMARINES') // Remove location number like "#1861813"
		.replace(/MAIDMARINES\.C/i, 'MAIDMARINES') // Remove ".C" suffix
		.replace(/\s+[A-Z]{2}\s*$/i, '') // Remove state codes like "NY"
		.replace(/\s+$/g, '') // Remove trailing whitespace
		.trim();

	return {
		merchant_normalized: 'MAIDMARINES',
		merchant_details: ''
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
 * Extract BLUEMERCURY details
 */
function extractBluemercuryDetails(merchant) {
	// Clean up BLUEMERCURY merchant name by removing store numbers and location information
	let cleanedMerchant = merchant
		.replace(/BLUEMERCURY\s+#\d+/i, 'BLUEMERCURY') // Remove store number like "#1710"
		.replace(/\s+NEW\s+YORK/i, '') // Remove "NEW YORK" location
		.replace(/\s+[A-Z]{2}\s*$/i, '') // Remove state codes like "NY"
		.replace(/\s+$/g, '') // Remove trailing whitespace
		.trim();

	return {
		merchant_normalized: 'BLUEMERCURY',
		merchant_details: cleanedMerchant || ''
	};
}

/**
 * Extract Google Cloud details
 */
function extractGoogleCloudDetails(merchant) {
	// Clean up Google Cloud merchant name by removing transaction IDs and help URLs
	merchant
		.replace(/GOOGLE\s*\*\s*CLOUD\s+[A-Z0-9]+\s+g\.co\/helppay#?/i, 'GOOGLE CLOUD') // Remove transaction ID and help URL
		.replace(/GOOGLE\s*\*\s*CLOUD\s+[A-Z0-9]+/i, 'GOOGLE CLOUD') // Remove transaction ID
		.replace(/GOOGLE\s*\*\s*CLOUD/i, 'GOOGLE CLOUD') // Normalize asterisk format
		.replace(/\s+g\.co\/helppay#?/i, '') // Remove help URL
		.replace(/\s+$/g, '') // Remove trailing whitespace
		.trim();

	return {
		merchant_normalized: 'GOOGLE CLOUD',
		merchant_details: ''
	};
}

/**
 * Extract PlayStation Network details
 */
function extractPlayStationNetworkDetails(merchant) {
	// Clean up PlayStation Network merchant name by removing transaction IDs and codes
	// Pattern: "PlayStation Network" followed by numbers and dashes
	let cleanedMerchant = merchant
		.replace(/PLAYSTATION\s+NETWORK\s+[0-9-]+/i, 'PLAYSTATION NETWORK') // Remove transaction codes like "12345-67890"
		.replace(/PLAYSTATION\s+NETWORK\s+[A-Z0-9-]+/i, 'PLAYSTATION NETWORK') // Remove any alphanumeric codes
		.replace(/\s+$/g, '') // Remove trailing whitespace
		.trim();

	return {
		merchant_normalized: 'PLAYSTATION NETWORK',
		merchant_details: ''
	};
}

/**
 * Check if transaction is a hotel
 */
function isHotelTransaction(merchantUpper) {
	const hotelIndicators = [
		'HOTEL',
		'RESORT',
		'INN',
		'SUITE',
		'LODGE',
		'ACCOMMODATION',
		'STAY'
	];

	// Check for generic hotel indicators
	if (hotelIndicators.some((indicator) => merchantUpper.includes(indicator))) {
		return true;
	}

	return false;
}

/**
 * Extract hotel details
 */
function extractHotelDetails(merchant) {
	const merchantUpper = merchant.toUpperCase();
	
	// Clean up hotel merchant name by removing common suffixes and location codes
	let cleanedMerchant = merchant
		.replace(/\s+[A-Z]{2}\s*$/i, '') // Remove state codes like "NY"
		.replace(/\s+\d{5}\s*$/i, '') // Remove ZIP codes
		.replace(/\s+LLC\b/i, '') // Remove LLC
		.replace(/\s+INC\b/i, '') // Remove INC
		.replace(/\s+CORP\b/i, '') // Remove CORP
		.replace(/\s+CO\b/i, '') // Remove CO
		.replace(/^THE\s+/i, '') // Remove "THE" prefix
		.trim();

	return {
		merchant_normalized: cleanedMerchant.toUpperCase(),
		merchant_details: ''
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
		.replace(/\s+LLC\b/i, '')
		.replace(/\s+INC\b/i, '')
		.replace(/\s+CORP\b/i, '')
		.replace(/\s+CO\b/i, '')
		.trim();

	// Remove location suffixes (common patterns)
	normalized = normalized.replace(/\s+[A-Z]{2}\s*$/i, ''); // Remove state codes
	normalized = normalized.replace(/\s+\d{5}\s*$/i, ''); // Remove ZIP codes

	// Convert to uppercase to ensure case-insensitive matching
	return normalized.toUpperCase();
}
