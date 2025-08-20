/**
 * Generate diverse market data for the 3D market globe visualization
 * @returns {Array} Array of financial instruments with various types and data
 */
export function generateMarketData() {
	try {
		const instruments = [
			// Major Tech Stocks
			{ symbol: 'AAPL', name: 'Apple Inc.', type: 'Stock', price: 175.43, priceChange: 2.34, volume: 45000000 },
			{ symbol: 'MSFT', name: 'Microsoft Corp.', type: 'Stock', price: 378.85, priceChange: -1.67, volume: 32000000 },
			{ symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Stock', price: 142.56, priceChange: 3.21, volume: 28000000 },
			{ symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Stock', price: 145.80, priceChange: 1.89, volume: 38000000 },
			{ symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'Stock', price: 485.09, priceChange: 5.67, volume: 52000000 },
			{ symbol: 'TSLA', name: 'Tesla Inc.', type: 'Stock', price: 248.50, priceChange: -2.45, volume: 65000000 },
			{ symbol: 'META', name: 'Meta Platforms', type: 'Stock', price: 334.92, priceChange: 4.12, volume: 29000000 },
			{ symbol: 'NFLX', name: 'Netflix Inc.', type: 'Stock', price: 485.09, priceChange: -0.89, volume: 18000000 },
			
			// Financial Services
			{ symbol: 'JPM', name: 'JPMorgan Chase', type: 'Stock', price: 172.45, priceChange: 1.23, volume: 25000000 },
			{ symbol: 'BAC', name: 'Bank of America', type: 'Stock', price: 34.67, priceChange: -0.78, volume: 42000000 },
			{ symbol: 'GS', name: 'Goldman Sachs', type: 'Stock', price: 389.12, priceChange: 2.89, volume: 15000000 },
			{ symbol: 'MS', name: 'Morgan Stanley', type: 'Stock', price: 89.34, priceChange: 1.45, volume: 18000000 },
			
			// Healthcare
			{ symbol: 'JNJ', name: 'Johnson & Johnson', type: 'Stock', price: 167.89, priceChange: 0.67, volume: 12000000 },
			{ symbol: 'PFE', name: 'Pfizer Inc.', type: 'Stock', price: 29.45, priceChange: -1.23, volume: 35000000 },
			{ symbol: 'UNH', name: 'UnitedHealth Group', type: 'Stock', price: 523.67, priceChange: 3.45, volume: 8000000 },
			
			// Consumer & Industrial
			{ symbol: 'HD', name: 'Home Depot', type: 'Stock', price: 342.56, priceChange: -0.89, volume: 9500000 },
			{ symbol: 'MCD', name: 'McDonald\'s Corp.', type: 'Stock', price: 289.34, priceChange: 1.12, volume: 12000000 },
			{ symbol: 'NKE', name: 'NIKE Inc.', type: 'Stock', price: 98.76, priceChange: 2.34, volume: 18000000 },
			{ symbol: 'BA', name: 'Boeing Co.', type: 'Stock', price: 234.56, priceChange: -3.21, volume: 22000000 },
			
			// Government Bonds
			{ symbol: 'US10Y', name: '10Y Treasury', type: 'Bond', price: 4.23, priceChange: -0.15, volume: 150000000 },
			{ symbol: 'US30Y', name: '30Y Treasury', type: 'Bond', price: 4.56, priceChange: -0.23, volume: 85000000 },
			{ symbol: 'US2Y', name: '2Y Treasury', type: 'Bond', price: 4.89, priceChange: 0.12, volume: 120000000 },
			
			// Corporate Bonds
			{ symbol: 'CORP1', name: 'Corporate Bond A', type: 'Bond', price: 98.45, priceChange: 0.34, volume: 25000000 },
			{ symbol: 'CORP2', name: 'Corporate Bond B', type: 'Bond', price: 97.89, priceChange: -0.67, volume: 18000000 },
			{ symbol: 'CORP3', name: 'Corporate Bond C', type: 'Bond', price: 99.12, priceChange: 0.89, volume: 22000000 },
			
			// Cryptocurrencies
			{ symbol: 'BTC', name: 'Bitcoin', type: 'Crypto', price: 43250.67, priceChange: 4.56, volume: 28000000000 },
			{ symbol: 'ETH', name: 'Ethereum', type: 'Crypto', price: 2650.89, priceChange: 2.34, volume: 15000000000 },
			{ symbol: 'SOL', name: 'Solana', type: 'Crypto', price: 98.45, priceChange: 7.89, volume: 8500000000 },
			{ symbol: 'ADA', name: 'Cardano', type: 'Crypto', price: 0.456, priceChange: -1.23, volume: 3200000000 },
			{ symbol: 'DOT', name: 'Polkadot', type: 'Crypto', price: 7.89, priceChange: 3.45, volume: 4500000000 },
			{ symbol: 'LINK', name: 'Chainlink', type: 'Crypto', price: 15.67, priceChange: -2.34, volume: 2800000000 },
			
			// Forex Pairs
			{ symbol: 'EUR/USD', name: 'Euro/US Dollar', type: 'Forex', price: 1.0892, priceChange: 0.45, volume: 180000000000 },
			{ symbol: 'GBP/USD', name: 'Pound/US Dollar', type: 'Forex', price: 1.2654, priceChange: -0.23, volume: 95000000000 },
			{ symbol: 'USD/JPY', name: 'US Dollar/Yen', type: 'Forex', price: 148.67, priceChange: 1.89, volume: 120000000000 },
			{ symbol: 'USD/CHF', name: 'US Dollar/Franc', type: 'Forex', price: 0.8765, priceChange: -0.67, volume: 65000000000 },
			{ symbol: 'AUD/USD', name: 'Australian Dollar/US Dollar', type: 'Forex', price: 0.6543, priceChange: 0.89, volume: 45000000000 },
			{ symbol: 'USD/CAD', name: 'US Dollar/Canadian Dollar', type: 'Forex', price: 1.3456, priceChange: -0.34, volume: 38000000000 },
			
			// Commodities
			{ symbol: 'GOLD', name: 'Gold Futures', type: 'Commodity', price: 2045.67, priceChange: 1.23, volume: 85000000 },
			{ symbol: 'SILVER', name: 'Silver Futures', type: 'Commodity', price: 23.45, priceChange: 2.67, volume: 45000000 },
			{ symbol: 'OIL', name: 'Crude Oil', type: 'Commodity', price: 78.90, priceChange: -2.34, volume: 120000000 },
			{ symbol: 'COPPER', name: 'Copper Futures', type: 'Commodity', price: 4.23, priceChange: 0.89, volume: 65000000 }
		];

		// Add some randomization to make it more dynamic
		const randomizedInstruments = instruments.map(instrument => ({
			...instrument,
			// Add small random variations to prices
			price: instrument.price * (1 + (Math.random() - 0.5) * 0.02),
			// Add small random variations to price changes
			priceChange: instrument.priceChange + (Math.random() - 0.5) * 2,
			// Add some volume variation
			volume: instrument.volume * (0.8 + Math.random() * 0.4)
		}));

		console.log('MarketDataGenerator: Generated', randomizedInstruments.length, 'instruments');
		console.log('MarketDataGenerator: Sample data:', randomizedInstruments[0]);
		return randomizedInstruments;
	} catch (error) {
		console.error('MarketDataGenerator: Error generating data:', error);
		// Return fallback data
		return [
			{
				symbol: 'AAPL',
				name: 'Apple Inc.',
				type: 'Stock',
				price: 175.43,
				priceChange: 2.34,
				volume: 45000000
			},
			{
				symbol: 'BTC',
				name: 'Bitcoin',
				type: 'Crypto',
				price: 43250.67,
				priceChange: 4.56,
				volume: 28000000000
			},
			{
				symbol: 'EUR/USD',
				name: 'Euro/US Dollar',
				type: 'Forex',
				price: 1.0892,
				priceChange: 0.45,
				volume: 180000000000
			}
		];
	}
}

/**
 * Generate real-time market data updates (for future use)
 * @param {Array} currentData - Current market data
 * @returns {Array} Updated market data with new prices
 */
export function updateMarketData(currentData) {
	if (!currentData || !Array.isArray(currentData)) {
		return generateMarketData();
	}

	return currentData.map(instrument => ({
		...instrument,
		// Simulate price movements
		price: instrument.price * (1 + (Math.random() - 0.5) * 0.01),
		priceChange: instrument.priceChange + (Math.random() - 0.5) * 0.5,
		// Keep volume relatively stable
		volume: instrument.volume * (0.95 + Math.random() * 0.1)
	}));
}