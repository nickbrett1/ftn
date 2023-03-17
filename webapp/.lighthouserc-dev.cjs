module.exports = {
	ci: {
		collect: {
			url: 'http://localhost:4173',
			numberOfRuns: 1,
			settings: {
				chromeFlags: '--no-sandbox'
			}
		},
		upload: {
			target: 'temporary-public-storage'
		},
		assert: {
			preset: 'lighthouse:recommended'
		}
	}
};
