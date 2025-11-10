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
	const database = platform.env.DB;

	try {
		// 1. Get the total number of countries
		const totalCountriesStmt = database.prepare(`
			SELECT COUNT(*) as count
			FROM dim_country
		`);
		const totalCountriesResult = await totalCountriesStmt.first('count');

		// 2. Get the number of reported data points per year
		const dataPointsPerYearStmt = database.prepare(`
			SELECT year, data_points_count
			FROM agg_wdi_data_points_by_year
			ORDER BY year ASC
		`);
		const dataPointsPerYearResult = await dataPointsPerYearStmt.all();

		// 3. Get the total number of indicators
		const totalIndicatorsStmt = database.prepare(`
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
	} catch (error) {
		console.error('Error fetching WDI coverage data from D1:', error);
		return {
			error: `Failed to fetch data: ${error.message}`,
			totalCountries: 0,
			dataPointsPerYearChart: null,
			totalIndicators: 0
		};
	}
}
