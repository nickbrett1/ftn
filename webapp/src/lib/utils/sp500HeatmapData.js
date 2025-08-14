// S&P 500 data generator for 3D Heatmap visualization
export function generateSP500HeatmapData() {
	const sectors = [
		'Technology',
		'Healthcare', 
		'Financial Services',
		'Consumer Discretionary',
		'Industrials'
	];
	
	const companies = [
		// Technology
		{ ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', marketCap: 3000000000000, priceChange: 2.5 },
		{ ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', marketCap: 2800000000000, priceChange: 1.8 },
		{ ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', marketCap: 1800000000000, priceChange: -0.7 },
		{ ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology', marketCap: 1600000000000, priceChange: 3.2 },
		{ ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', marketCap: 1200000000000, priceChange: 5.8 },
		{ ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', marketCap: 1100000000000, priceChange: -1.2 },
		{ ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Technology', marketCap: 800000000000, priceChange: 4.1 },
		{ ticker: 'NFLX', name: 'Netflix Inc.', sector: 'Technology', marketCap: 250000000000, priceChange: -2.3 },
		{ ticker: 'ADBE', name: 'Adobe Inc.', sector: 'Technology', marketCap: 200000000000, priceChange: 1.5 },
		{ ticker: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', marketCap: 180000000000, priceChange: -0.9 },
		
		// Healthcare
		{ ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', marketCap: 400000000000, priceChange: 0.8 },
		{ ticker: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', marketCap: 150000000000, priceChange: -1.5 },
		{ ticker: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Healthcare', marketCap: 500000000000, priceChange: 2.1 },
		{ ticker: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', marketCap: 300000000000, priceChange: -0.6 },
		{ ticker: 'TMO', name: 'Thermo Fisher Scientific Inc.', sector: 'Healthcare', marketCap: 200000000000, priceChange: 1.3 },
		{ ticker: 'ABT', name: 'Abbott Laboratories', sector: 'Healthcare', marketCap: 180000000000, priceChange: 0.9 },
		{ ticker: 'DHR', name: 'Danaher Corporation', sector: 'Healthcare', marketCap: 160000000000, priceChange: -1.1 },
		{ ticker: 'LLY', name: 'Eli Lilly and Company', sector: 'Healthcare', marketCap: 600000000000, priceChange: 3.7 },
		{ ticker: 'BMY', name: 'Bristol-Myers Squibb', sector: 'Healthcare', marketCap: 120000000000, priceChange: -0.8 },
		{ ticker: 'AMGN', name: 'Amgen Inc.', sector: 'Healthcare', marketCap: 140000000000, priceChange: 1.2 },
		
		// Financial Services
		{ ticker: 'BRK.A', name: 'Berkshire Hathaway Inc.', sector: 'Financial Services', marketCap: 800000000000, priceChange: 0.5 },
		{ ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services', marketCap: 500000000000, priceChange: 1.8 },
		{ ticker: 'BAC', name: 'Bank of America Corp.', sector: 'Financial Services', marketCap: 250000000000, priceChange: -0.7 },
		{ ticker: 'WFC', name: 'Wells Fargo & Company', sector: 'Financial Services', marketCap: 180000000000, priceChange: 0.9 },
		{ ticker: 'GS', name: 'Goldman Sachs Group Inc.', sector: 'Financial Services', marketCap: 120000000000, priceChange: -1.2 },
		{ ticker: 'MS', name: 'Morgan Stanley', sector: 'Financial Services', marketCap: 140000000000, priceChange: 1.1 },
		{ ticker: 'C', name: 'Citigroup Inc.', sector: 'Financial Services', marketCap: 100000000000, priceChange: -0.5 },
		{ ticker: 'BLK', name: 'BlackRock Inc.', sector: 'Financial Services', marketCap: 110000000000, priceChange: 2.3 },
		{ ticker: 'SCHW', name: 'Charles Schwab Corporation', sector: 'Financial Services', marketCap: 80000000000, priceChange: -1.8 },
		{ ticker: 'USB', name: 'U.S. Bancorp', sector: 'Financial Services', marketCap: 60000000000, priceChange: 0.6 },
		
		// Consumer Discretionary
		{ ticker: 'HD', name: 'Home Depot Inc.', sector: 'Consumer Discretionary', marketCap: 300000000000, priceChange: 1.2 },
		{ ticker: 'MCD', name: 'McDonald\'s Corporation', sector: 'Consumer Discretionary', marketCap: 200000000000, priceChange: -0.4 },
		{ ticker: 'DIS', name: 'Walt Disney Company', sector: 'Consumer Discretionary', marketCap: 180000000000, priceChange: 2.8 },
		{ ticker: 'NKE', name: 'NIKE Inc.', sector: 'Consumer Discretionary', marketCap: 150000000000, priceChange: -1.1 },
		{ ticker: 'SBUX', name: 'Starbucks Corporation', sector: 'Consumer Discretionary', marketCap: 100000000000, priceChange: 0.7 },
		{ ticker: 'TJX', name: 'TJX Companies Inc.', sector: 'Consumer Discretionary', marketCap: 80000000000, priceChange: 1.5 },
		{ ticker: 'BKNG', name: 'Booking Holdings Inc.', sector: 'Consumer Discretionary', marketCap: 90000000000, priceChange: -0.9 },
		{ ticker: 'MAR', name: 'Marriott International Inc.', sector: 'Consumer Discretionary', marketCap: 60000000000, priceChange: 1.8 },
		{ ticker: 'LOW', name: 'Lowe\'s Companies Inc.', sector: 'Consumer Discretionary', marketCap: 120000000000, priceChange: -0.6 },
		{ ticker: 'TGT', name: 'Target Corporation', sector: 'Consumer Discretionary', marketCap: 70000000000, priceChange: 0.4 },
		
		// Industrials
		{ ticker: 'UNP', name: 'Union Pacific Corporation', sector: 'Industrials', marketCap: 150000000000, priceChange: 0.8 },
		{ ticker: 'UPS', name: 'United Parcel Service Inc.', sector: 'Industrials', marketCap: 120000000000, priceChange: -1.3 },
		{ ticker: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials', marketCap: 100000000000, priceChange: 2.1 },
		{ ticker: 'BA', name: 'Boeing Company', sector: 'Industrials', marketCap: 80000000000, priceChange: -2.7 },
		{ ticker: 'MMM', name: '3M Company', sector: 'Industrials', marketCap: 60000000000, priceChange: 0.5 },
		{ ticker: 'GE', name: 'General Electric Company', sector: 'Industrials', marketCap: 90000000000, priceChange: 1.7 },
		{ ticker: 'HON', name: 'Honeywell International Inc.', sector: 'Industrials', marketCap: 110000000000, priceChange: -0.8 },
		{ ticker: 'RTX', name: 'Raytheon Technologies Corporation', sector: 'Industrials', marketCap: 120000000000, priceChange: 1.2 },
		{ ticker: 'LMT', name: 'Lockheed Martin Corporation', sector: 'Industrials', marketCap: 100000000000, priceChange: 0.9 },
		{ ticker: 'DE', name: 'Deere & Company', sector: 'Industrials', marketCap: 80000000000, priceChange: -1.1 }
	];
	
	return companies;
}