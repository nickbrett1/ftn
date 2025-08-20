/**
 * Generate data for key financial centers around the world
 * @returns {Array} Array of financial center objects with coordinates and market data
 */
export function generateFinancialCentersData() {
	try {
		const financialCenters = [
			{
				name: 'New York',
				country: 'United States',
				latitude: 40.7128,
				longitude: -74.0060,
				timezone: 'EST/EDT',
				markets: ['NYSE', 'NASDAQ', 'Bonds', 'Forex', 'Commodities'],
				marketSentiment: 2.3,
				importance: 3, // Highest importance
				description: 'World\'s largest financial center, home to Wall Street'
			},
			{
				name: 'London',
				country: 'United Kingdom',
				latitude: 51.5074,
				longitude: -0.1278,
				timezone: 'GMT/BST',
				markets: ['LSE', 'Bonds', 'Forex', 'Commodities', 'Insurance'],
				marketSentiment: 1.8,
				importance: 3,
				description: 'Europe\'s leading financial hub, major forex trading center'
			},
			{
				name: 'Hong Kong',
				country: 'China',
				latitude: 22.3193,
				longitude: 114.1694,
				timezone: 'HKT',
				markets: ['HKEX', 'Stocks', 'Bonds', 'Forex', 'Wealth Management'],
				marketSentiment: -0.5,
				importance: 2,
				description: 'Asia-Pacific financial gateway, major IPO destination'
			},
			{
				name: 'Tokyo',
				country: 'Japan',
				latitude: 35.6762,
				longitude: 139.6503,
				timezone: 'JST',
				markets: ['TSE', 'Bonds', 'Forex', 'Insurance', 'Banking'],
				marketSentiment: 0.7,
				importance: 2,
				description: 'Asia\'s largest stock market, major banking center'
			},
			{
				name: 'Singapore',
				country: 'Singapore',
				latitude: 1.3521,
				longitude: 103.8198,
				timezone: 'SGT',
				markets: ['SGX', 'Forex', 'Commodities', 'Wealth Management', 'Insurance'],
				marketSentiment: 1.2,
				importance: 2,
				description: 'Southeast Asia\'s financial hub, major forex center'
			},
			{
				name: 'Dubai',
				country: 'UAE',
				latitude: 25.2048,
				longitude: 55.2708,
				timezone: 'GST',
				markets: ['DFM', 'Forex', 'Commodities', 'Islamic Finance', 'Real Estate'],
				marketSentiment: 0.9,
				importance: 1,
				description: 'Middle East financial center, Islamic finance hub'
			},
			{
				name: 'São Paulo',
				country: 'Brazil',
				latitude: -23.5505,
				longitude: -46.6333,
				timezone: 'BRT/BRST',
				markets: ['B3', 'Stocks', 'Bonds', 'Forex', 'Commodities'],
				marketSentiment: -1.1,
				importance: 1,
				description: 'Latin America\'s largest financial center'
			},
			{
				name: 'Mumbai',
				country: 'India',
				latitude: 19.0760,
				longitude: 72.8777,
				timezone: 'IST',
				markets: ['BSE', 'NSE', 'Bonds', 'Forex', 'Insurance'],
				marketSentiment: 1.5,
				importance: 1,
				description: 'India\'s financial capital, major stock exchange hub'
			},
			{
				name: 'Sydney',
				country: 'Australia',
				latitude: -33.8688,
				longitude: 151.2093,
				timezone: 'AEST/AEDT',
				markets: ['ASX', 'Bonds', 'Forex', 'Commodities', 'Banking'],
				marketSentiment: 0.3,
				importance: 1,
				description: 'Oceania\'s financial hub, major commodity trading center'
			}
		];

		// Add some randomization to make it more dynamic
		const randomizedCenters = financialCenters.map(center => ({
			...center,
			// Add small random variations to market sentiment
			marketSentiment: center.marketSentiment + (Math.random() - 0.5) * 2,
			// Add some market activity indicators
			marketActivity: Math.random() * 100,
			// Add trading volume
			tradingVolume: Math.random() * 1000000000000 + 100000000000 // 100B to 1.1T
		}));

		console.log('FinancialCentersData: Generated', randomizedCenters.length, 'financial centers');
		console.log('FinancialCentersData: Sample data:', randomizedCenters[0]);
		return randomizedCenters;
	} catch (error) {
		console.error('FinancialCentersData: Error generating data:', error);
		// Return fallback data
		return [
			{
				name: 'New York',
				country: 'United States',
				latitude: 40.7128,
				longitude: -74.0060,
				timezone: 'EST/EDT',
				markets: ['NYSE', 'NASDAQ'],
				marketSentiment: 2.3,
				importance: 3
			},
			{
				name: 'London',
				country: 'United Kingdom',
				latitude: 51.5074,
				longitude: -0.1278,
				timezone: 'GMT/BST',
				markets: ['LSE', 'Forex'],
				marketSentiment: 1.8,
				importance: 3
			}
		];
	}
}

/**
 * Get real-time market sentiment updates (for future use)
 * @param {Array} currentData - Current financial center data
 * @returns {Array} Updated data with new sentiment values
 */
export function updateFinancialCentersData(currentData) {
	if (!currentData || !Array.isArray(currentData)) {
		return generateFinancialCentersData();
	}

	return currentData.map(center => ({
		...center,
		// Simulate market sentiment changes
		marketSentiment: center.marketSentiment + (Math.random() - 0.5) * 1,
		// Update market activity
		marketActivity: Math.max(0, center.marketActivity + (Math.random() - 0.5) * 20),
		// Update trading volume
		tradingVolume: center.tradingVolume * (0.95 + Math.random() * 0.1)
	}));
}

/**
 * Get financial center by name
 * @param {string} name - Financial center name
 * @returns {Object|null} Financial center data or null if not found
 */
export function getFinancialCenterByName(name) {
	const centers = generateFinancialCentersData();
	return centers.find(center => center.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Get financial centers by region
 * @param {string} region - Region name (Americas, Europe, Asia, etc.)
 * @returns {Array} Array of financial centers in the specified region
 */
export function getFinancialCentersByRegion(region) {
	const centers = generateFinancialCentersData();
	const regionMap = {
		'americas': ['New York', 'São Paulo'],
		'europe': ['London'],
		'asia': ['Hong Kong', 'Tokyo', 'Singapore', 'Mumbai'],
		'middle-east': ['Dubai'],
		'oceania': ['Sydney']
	};
	
	const regionCenters = regionMap[region.toLowerCase()] || [];
	return centers.filter(center => regionCenters.includes(center.name));
}