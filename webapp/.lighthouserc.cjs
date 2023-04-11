module.exports = {
	ci: {
		collect: {
			startServerCommand: 'npm run lighthouse',
			startServerReadyPattern: 'preview',
			url: ['http://localhost:4173'],
			extends: 'lighthouse:default',
			settings: {
				cpuSlowdownMultiplier: 2.4,
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
				'unused-javascript': 'off', // Three.JS pulls in a lot of unused JS
				'uses-text-compression': 'off' // Cloudflare handles this
			}
		}
	}
};
