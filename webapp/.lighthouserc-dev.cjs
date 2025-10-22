module.exports = {
	ci: {
		collect: {
			url: 'http://localhost:5173',
			numberOfRuns: 1,
			settings: {
				chromeFlags: '--no-sandbox',
				formFactor: 'desktop',
				screenEmulation: {
					mobile: false, // Mobile doesn't detect binary files for compression: https://github.com/GoogleChrome/lighthouse/issues/9826
					width: 1350,
					height: 940,
					deviceScaleFactor: 1,
					disabled: false
				}
			}
		},
		upload: {
			target: 'temporary-public-storage'
		},
		assert: {
			preset: 'lighthouse:recommended',
			assertions: {
				'link-name': 'off' // svelte-awesome-icons v3 breaking change - icons in links don't pass this check
			}
		}
	}
};
