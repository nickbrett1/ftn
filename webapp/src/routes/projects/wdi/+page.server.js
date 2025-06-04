export async function load({ platform }) {
	if (!platform?.env?.DB) {
		console.error('D1 Database (DB) not found in platform environment.');
		return {
			error: 'Database connection not available. Please check server configuration.',
			totalCountries: 0,
			dataPointsPerYearChart: null,
			totalIndicators: 0
		};
	}
	const db = platform.env.DB;

	try {
		// 1. Get the total number of countries
		const totalCountriesStmt = db.prepare(`
			SELECT COUNT(*) as count
			FROM dim_country
		`);
		const totalCountriesResult = await totalCountriesStmt.first('count');

		// 2. Get the number of reported data points per year
		const dataPointsPerYearStmt = db.prepare(`
			SELECT year, COUNT(value) as data_points_count
			FROM fct_wdi_history
			WHERE value IS NOT NULL
			GROUP BY year
			ORDER BY year ASC
		`);
		const dataPointsPerYearResult = await dataPointsPerYearStmt.all();

		// 3. Get the total number of indicators
		const totalIndicatorsStmt = db.prepare(`
			SELECT COUNT(*) as count
			FROM dim_indicator
		`);
		const totalIndicatorsResult = await totalIndicatorsStmt.first('count');

		// Prepare chart data for data points per year
		let dataPointsChart = null;
		if (dataPointsPerYearResult.results && dataPointsPerYearResult.results.length > 0) {
			dataPointsChart = {
				series: [
					{
						name: 'Data Points',
						data: dataPointsPerYearResult.results.map((row) => ({
							x: row.year,
							y: row.data_points_count
						}))
					}
				]
			};
		}

		return {
			totalCountries: totalCountriesResult || 0,
			dataPointsPerYearChart: dataPointsChart,
			totalIndicators: totalIndicatorsResult || 0
		};
	} catch (e) {
		console.error('Error fetching WDI coverage data from D1:', e);
		return {
			error: `Failed to fetch data: ${e.message}`,
			totalCountries: 0,
			dataPointsPerYearChart: null,
			totalIndicators: 0
		};
	}
}
