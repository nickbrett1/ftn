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
	if (merchantUpper.includes('CAVIAR') || merchantUpper.includes('DOORDASH') || merchantUpper.includes('UBER EATS')) {
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
	
	// Gas stations
	if (isGasStation(merchantUpper)) {
		return extractGasStationDetails(merchant);
	}
	
	// Grocery stores
	if (isGroceryStore(merchantUpper)) {
		return extractGroceryDetails(merchant);
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
		'UNITED', 'AMERICAN', 'DELTA', 'SOUTHWEST', 'JETBLUE', 
		'SPIRIT', 'FRONTIER', 'ALASKA', 'BRITISH AIRWAYS', 
		'LUFTHANSA', 'AIR CANADA', 'EMIRATES', 'QATAR'
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
 * Extract gas station details
 */
function extractGasStationDetails(merchant) {
	const merchantUpper = merchant.toUpperCase();
	
	// Common gas station chains
	const gasStations = [
		'SHELL', 'EXXON', 'MOBIL', 'BP', 'CHEVRON', 'TEXACO',
		'MARATHON', 'SUNOCO', 'CITGO', 'VALERO', 'ARCO'
	];
	
	for (const station of gasStations) {
		if (merchantUpper.includes(station)) {
			return {
				merchant_normalized: station,
				merchant_details: ''
			};
		}
	}
	
	return {
		merchant_normalized: 'GAS STATION',
		merchant_details: merchant
	};
}

/**
 * Extract grocery store details
 */
function extractGroceryDetails(merchant) {
	const merchantUpper = merchant.toUpperCase();
	
	// Common grocery chains
	const groceryStores = [
		'SAFEWAY', 'KROGER', 'ALBERTSONS', 'PUBLIX', 'HARRIS TEETER',
		'FOOD LION', 'WINN DIXIE', 'MEIJER', 'HY VEE', 'FRESH MARKET'
	];
	
	for (const store of groceryStores) {
		if (merchantUpper.includes(store)) {
			return {
				merchant_normalized: store,
				merchant_details: ''
			};
		}
	}
	
	return {
		merchant_normalized: 'GROCERY STORE',
		merchant_details: merchant
	};
}

/**
 * Check if transaction is a flight
 */
function isFlightTransaction(merchantUpper) {
	const flightIndicators = [
		'FLIGHT', 'AIRLINE', 'AIRPORT', 'TICKET', 'TRAVEL',
		'HOTEL', 'CAR RENTAL', 'TRANSPORTATION'
	];
	
	return flightIndicators.some(indicator => merchantUpper.includes(indicator));
}

/**
 * Check if transaction is at a gas station
 */
function isGasStation(merchantUpper) {
	const gasIndicators = [
		'GAS', 'FUEL', 'SHELL', 'EXXON', 'MOBIL', 'BP', 'CHEVRON',
		'TEXACO', 'MARATHON', 'SUNOCO', 'CITGO', 'VALERO', 'ARCO'
	];
	
	return gasIndicators.some(indicator => merchantUpper.includes(indicator));
}

/**
 * Check if transaction is at a grocery store
 */
function isGroceryStore(merchantUpper) {
	const groceryIndicators = [
		'GROCERY', 'FOOD', 'MARKET', 'SUPERMARKET', 'SAFEWAY',
		'KROGER', 'ALBERTSONS', 'PUBLIX', 'HARRIS TEETER'
	];
	
	return groceryIndicators.some(indicator => merchantUpper.includes(indicator));
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
