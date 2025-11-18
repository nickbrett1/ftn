import { describe, it, expect, vi } from 'vitest';
import { load } from './+page.server';

describe('/src/routes/projects/dbt-duckdb/+page.server.js', () => {
	// Mock the platform object and its environment bindings
	const mockDB = {
		prepare: vi.fn(),
		first: vi.fn(),
		all: vi.fn()
	};

	const mockPlatform = {
		env: {
			DB: mockDB
		}
	};

	// Reset mocks before each test
	beforeEach(() => {
		vi.clearAllMocks();
		// Spy on console.error to check if it's called
		vi.spyOn(console, 'error').mockImplementation(() => {});
	}); // Restore console.error after all tests
	afterAll(() => {
		vi.restoreAllMocks();
	});

	it('should return error if DB binding is missing', async () => {
		const result = await load({ platform: { env: {} } });

		expect(result).toEqual({
			error: 'Database connection not available. Please check server configuration.',
			totalCountries: 0,
			dataPointsPerYearChart: null,
			totalIndicators: 0
		});
		expect(mockDB.prepare).not.toHaveBeenCalled();
	});

	it('should fetch and return data successfully', async () => {
		// Mock database responses
		mockDB.prepare.mockImplementation((sql) => {
			if (sql.includes('dim_country')) {
				return { first: vi.fn().mockResolvedValue(150) };
			}
			if (sql.includes('agg_wdi_data_points_by_year')) {
				return {
					all: vi.fn().mockResolvedValue({
						results: [
							{ year: 2000, data_points_count: 1000 },
							{ year: 2001, data_points_count: 1200 }
						]
					})
				};
			}
			if (sql.includes('dim_indicator')) {
				return { first: vi.fn().mockResolvedValue(500) };
			}
			return {
				first: vi.fn().mockResolvedValue(null),
				all: vi.fn().mockResolvedValue({ results: [] })
			};
		});

		const result = await load({ platform: mockPlatform });

		expect(mockDB.prepare).toHaveBeenCalledTimes(3);
		expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('dim_country'));
		expect(mockDB.prepare).toHaveBeenCalledWith(
			expect.stringContaining('agg_wdi_data_points_by_year')
		);
		expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('dim_indicator'));

		expect(result).toEqual({
			totalCountries: 150,
			dataPointsPerYearChart: {
				series: [
					{
						name: 'Data Points',
						data: [
							{ x: 2000, y: 1000 },
							{ x: 2001, y: 1200 }
						]
					}
				]
			},
			totalIndicators: 500
		});
	});

	it('should handle empty data points result gracefully', async () => {
		// Mock database responses with empty results for the chart data
		mockDB.prepare.mockImplementation((sql) => {
			if (sql.includes('dim_country')) {
				return { first: vi.fn().mockResolvedValue(150) };
			}
			if (sql.includes('agg_wdi_data_points_by_year')) {
				return { all: vi.fn().mockResolvedValue({ results: [] }) }; // Empty results
			}
			if (sql.includes('dim_indicator')) {
				return { first: vi.fn().mockResolvedValue(500) };
			}
			return {
				first: vi.fn().mockResolvedValue(null),
				all: vi.fn().mockResolvedValue({ results: [] })
			};
		});

		const result = await load({ platform: mockPlatform });

		expect(result).toEqual({
			totalCountries: 150,
			dataPointsPerYearChart: null, // Should be null for empty results
			totalIndicators: 500
		});
	});

	it('should handle database errors', async () => {
		const mockError = new Error('Database query failed');
		mockDB.prepare.mockImplementation(() => {
			return {
				first: vi.fn().mockRejectedValue(mockError), // Simulate an error
				all: vi.fn().mockRejectedValue(mockError)
			};
		});

		const result = await load({ platform: mockPlatform });

		expect(console.error).toHaveBeenCalledWith(
			'Error fetching WDI coverage data from D1:',
			mockError
		);
		expect(result).toEqual({
			error: `Failed to fetch data: ${mockError.message}`,
			totalCountries: 0,
			dataPointsPerYearChart: null,
			totalIndicators: 0
		});
	});
});
