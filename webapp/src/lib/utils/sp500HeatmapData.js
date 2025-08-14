/**
 * Generate mock S&P 500 data for 3D heatmap visualization
 * @returns {Array} Array of security objects with ticker, name, sector, market cap, and price change
 */
export function generateSP500HeatmapData() {
	try {
		const sectors = [
			'Technology',
			'Healthcare',
			'Financial Services',
			'Consumer Cyclical',
			'Communication Services',
			'Industrials',
			'Consumer Defensive',
			'Energy',
			'Real Estate',
			'Basic Materials',
			'Utilities'
		];

		const companies = [
			// Technology
			{ ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
			{ ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
			{ ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
			{ ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology' },
			{ ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
			{ ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Technology' },
			{ ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Technology' },
			{ ticker: 'NFLX', name: 'Netflix Inc.', sector: 'Technology' },
			
			// Healthcare
			{ ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
			{ ticker: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare' },
			{ ticker: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Healthcare' },
			{ ticker: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare' },
			{ ticker: 'TMO', name: 'Thermo Fisher Scientific Inc.', sector: 'Healthcare' },
			{ ticker: 'ABT', name: 'Abbott Laboratories', sector: 'Healthcare' },
			
			// Financial Services
			{ ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services' },
			{ ticker: 'BAC', name: 'Bank of America Corp.', sector: 'Financial Services' },
			{ ticker: 'WFC', name: 'Wells Fargo & Company', sector: 'Financial Services' },
			{ ticker: 'GS', name: 'Goldman Sachs Group Inc.', sector: 'Financial Services' },
			{ ticker: 'MS', name: 'Morgan Stanley', sector: 'Financial Services' },
			
			// Consumer Cyclical
			{ ticker: 'HD', name: 'Home Depot Inc.', sector: 'Consumer Cyclical' },
			{ ticker: 'MCD', name: 'McDonald\'s Corporation', sector: 'Consumer Cyclical' },
			{ ticker: 'NKE', name: 'NIKE Inc.', sector: 'Consumer Cyclical' },
			{ ticker: 'SBUX', name: 'Starbucks Corporation', sector: 'Consumer Cyclical' },
			
			// Communication Services
			{ ticker: 'DIS', name: 'Walt Disney Company', sector: 'Communication Services' },
			{ ticker: 'CMCSA', name: 'Comcast Corporation', sector: 'Communication Services' },
			{ ticker: 'VZ', name: 'Verizon Communications Inc.', sector: 'Communication Services' },
			
			// Industrials
			{ ticker: 'BA', name: 'Boeing Company', sector: 'Industrials' },
			{ ticker: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials' },
			{ ticker: 'MMM', name: '3M Company', sector: 'Industrials' },
			{ ticker: 'GE', name: 'General Electric Company', sector: 'Industrials' },
			
			// Consumer Defensive
			{ ticker: 'KO', name: 'Coca-Cola Company', sector: 'Consumer Defensive' },
			{ ticker: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer Defensive' },
			{ ticker: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Defensive' },
			{ ticker: 'COST', name: 'Costco Wholesale Corporation', sector: 'Consumer Defensive' },
			
			// Energy
			{ ticker: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy' },
			{ ticker: 'CVX', name: 'Chevron Corporation', sector: 'Energy' },
			{ ticker: 'COP', name: 'ConocoPhillips', sector: 'Energy' },
			
			// Real Estate
			{ ticker: 'AMT', name: 'American Tower Corporation', sector: 'Real Estate' },
			{ ticker: 'PLD', name: 'Prologis Inc.', sector: 'Real Estate' },
			
			// Basic Materials
			{ ticker: 'LIN', name: 'Linde plc', sector: 'Basic Materials' },
			{ ticker: 'APD', name: 'Air Products and Chemicals Inc.', sector: 'Basic Materials' },
			
			// Utilities
			{ ticker: 'NEE', name: 'NextEra Energy Inc.', sector: 'Utilities' },
			{ ticker: 'DUK', name: 'Duke Energy Corporation', sector: 'Utilities' }
		];

		const result = companies.map(company => ({
			...company,
			marketCap: Math.random() * 900 + 100, // $100B to $1T
			priceChange: (Math.random() - 0.5) * 20 // -10% to +10%
		}));

		console.log('SP500HeatmapData: Generated', result.length, 'companies');
		return result;
	} catch (error) {
		console.error('SP500HeatmapData: Error generating data:', error);
		// Return fallback data
		return [
			{
				ticker: 'AAPL',
				name: 'Apple Inc.',
				sector: 'Technology',
				marketCap: 500,
				priceChange: 2.5
			},
			{
				ticker: 'MSFT',
				name: 'Microsoft Corporation',
				sector: 'Technology',
				marketCap: 450,
				priceChange: -1.2
			}
		];
	}
}