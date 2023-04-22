module.exports = {
	ci: {
		collect: {
			startServerCommand: 'npm run lighthouse',
			startServerReadyPattern: 'preview',
			url: ['http://localhost:4173'],
			extends: 'lighthouse:default',
			settings: {
				cpuSlowdownMultiplier: 2.4,
				chromeFlags: '--no-sandbox'
			}
		},
		upload: {
			target: 'temporary-public-storage'
		},
		assert: {
			preset: 'lighthouse:recommended',
			assertions: {
				'uses-text-compression': 'off' // Doesn't detect binary files when considering compression: https://github.com/GoogleChrome/lighthouse/issues/9826
			}
		}
	}
};
