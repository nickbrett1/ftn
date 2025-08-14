import { describe, it, expect } from 'vitest';
import { generateMockData } from './mockData';

describe('mockData', () => {
	describe('generateMockData', () => {
		it('should return an array of securities', () => {
			const data = generateMockData();
			expect(Array.isArray(data)).toBe(true);
			expect(data.length).toBeGreaterThan(0);
		});

		it('should have the correct structure for each security', () => {
			const data = generateMockData();
			const security = data[0];

			expect(security).toHaveProperty('ticker');
			expect(security).toHaveProperty('name');
			expect(security).toHaveProperty('sector');
			expect(security).toHaveProperty('marketCap');
			expect(security).toHaveProperty('priceChange');

			expect(typeof security.ticker).toBe('string');
			expect(typeof security.name).toBe('string');
			expect(typeof security.sector).toBe('string');
			expect(typeof security.marketCap).toBe('number');
			expect(typeof security.priceChange).toBe('number');
		});

		it('should include all expected sectors', () => {
			const data = generateMockData();
			const sectors = [...new Set(data.map(s => s.sector))];

			expect(sectors).toContain('Technology');
			expect(sectors).toContain('Healthcare');
			expect(sectors).toContain('Financial Services');
			expect(sectors).toContain('Consumer Discretionary');
			expect(sectors).toContain('Industrials');
		});

		it('should have realistic market cap values', () => {
			const data = generateMockData();
			
			data.forEach(security => {
				expect(security.marketCap).toBeGreaterThan(0);
				expect(security.marketCap).toBeLessThan(10000000000000); // Less than 10 trillion
			});
		});

		it('should have realistic price change values', () => {
			const data = generateMockData();
			
			data.forEach(security => {
				expect(security.priceChange).toBeGreaterThan(-20); // Not more than -20%
				expect(security.priceChange).toBeLessThan(20); // Not more than +20%
			});
		});

		it('should have unique ticker symbols', () => {
			const data = generateMockData();
			const tickers = data.map(s => s.ticker);
			const uniqueTickers = [...new Set(tickers)];

			expect(uniqueTickers.length).toBe(tickers.length);
		});

		it('should have companies in each sector', () => {
			const data = generateMockData();
			const sectorCounts = {};

			data.forEach(security => {
				sectorCounts[security.sector] = (sectorCounts[security.sector] || 0) + 1;
			});

			Object.values(sectorCounts).forEach(count => {
				expect(count).toBeGreaterThan(0);
			});
		});
	});
});