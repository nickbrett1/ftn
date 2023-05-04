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
				'unused-javascript': 'off', // Three.JS pulls in a lot of unused JS
				'uses-text-compression': 'off', // Doesn't detect binary files when considering compression: https://github.com/GoogleChrome/lighthouse/issues/9826
				'valid-source-maps': 'off' // We have sourcemaps but loading can be too slow to detect
			}
		}
	}
};
