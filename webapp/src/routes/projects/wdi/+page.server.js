export async function load({ platform, url }) {
	if (!platform?.env?.DB) {
		console.error('D1 Database (DB) not found in platform environment.');
		return {
			error: 'Database connection not available. Please check server configuration.',
			countries: [],
			indicators: [],
			chartData: null
		};
	}
	const db = platform.env.DB;
	const selectedCountryCode = url.searchParams.get('country');
	const selectedIndicatorCodes = url.searchParams.getAll('indicator');

	try {
		// Fetch all countries for the selector
		const countriesStmt = db.prepare(`
			SELECT country_code, country_name
			FROM dim_country
			ORDER BY country_name ASC
		`);
		const countriesResult = await countriesStmt.all();

		// Fetch all indicators for the selector
		const indicatorsStmt = db.prepare(`
			SELECT indicator_code, indicator_name
			FROM dim_indicator
			ORDER BY indicator_name ASC
		`);
		const indicatorsResult = await indicatorsStmt.all();

		let seriesData = [];
		let chartTitle = 'WDI Data';

		if (selectedCountryCode && selectedIndicatorCodes.length > 0) {
			const countryNameRes = await db
				.prepare(`SELECT country_name FROM dim_country WHERE country_code = ?1`)
				.bind(selectedCountryCode)
				.first('country_name');
			chartTitle = `WDI Data for ${countryNameRes || selectedCountryCode}`;

			const seriesPromises = selectedIndicatorCodes.map(async (indicatorCode) => {
				const historyStmt = db.prepare(`
                    SELECT h.year, h.value, i.indicator_name
                    FROM fct_wdi_history h
                    JOIN dim_indicator i ON h.indicator_code = i.indicator_code
                    WHERE h.country_code = ?1 AND h.indicator_code = ?2 AND h.value IS NOT NULL
                    ORDER BY h.year ASC
                `);
				const historyResult = await historyStmt.bind(selectedCountryCode, indicatorCode).all();

				return {
					name:
						historyResult.results.length > 0
							? historyResult.results[0].indicator_name
							: indicatorCode,
					data: historyResult.results.map((row) => ({ x: row.year, y: parseFloat(row.value) }))
				};
			});
			seriesData = await Promise.all(seriesPromises);
			seriesData = seriesData.filter((series) => series.data.length > 0);
		}

		return {
			countries: countriesResult.results || [],
			indicators: indicatorsResult.results || [],
			selectedCountry: selectedCountryCode,
			selectedIndicators: selectedIndicatorCodes,
			chartData: seriesData.length > 0 ? { title: chartTitle, series: seriesData } : null
		};
	} catch (e) {
		console.error('Error fetching WDI data from D1:', e);
		return {
			error: `Failed to fetch data: ${e.message}`,
			countries: [],
			indicators: [],
			chartData: null
		};
	}
}
