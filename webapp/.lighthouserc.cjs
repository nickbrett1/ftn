module.exports = {
	ci: {
		collect: {
			startServerCommand: 'npm run lighthouse',
			startServerReadyPattern: 'preview',
			url: ['http://localhost:4173'],
			numberOfRuns: 1,
			extends: 'lighthouse:default',
			settings: {
				chromeFlags: '--no-sandbox'
			}
		},
		upload: {
			target: 'temporary-public-storage'
		},
		assert: {
			preset: 'lighthouse:recommended',
			assertions: {
				'unused-javascript': 'off', // Three.JS pulls in a lot of unused JS
				'uses-text-compression': 'off', // Doesn't detect binary files when considering compression: https://github.com/GoogleChrome/lighthouse/issues/9826
				'valid-source-maps': 'off' // Sometimes fails due to timeouts: https://github.com/GoogleChrome/lighthouse/issues/6512
			}
		}
	}
};
