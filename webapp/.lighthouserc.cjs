module.exports = {
	ci: {
		collect: {
			startServerCommand: 'npm run lighthouse',
			startServerReadyPattern: 'preview',
			url: ['http://127.0.0.1:4173'],
			numberOfRuns: 1,
			extends: 'lighthouse:default',
			settings: {
				chromeFlags: '--no-sandbox'
			},
			// Add a delay to ensure manifest is properly generated
			waitForServer: 5000
		},
		upload: {
			target: 'temporary-public-storage'
		},
		assert: {
			preset: 'lighthouse:recommended',
			assertions: {
				'unused-javascript': 'off', // Three.JS pulls in a lot of unused JS
				'uses-text-compression': 'off', // Doesn't detect binary files when considering compression: https://github.com/GoogleChrome/lighthouse/issues/9826
				'valid-source-maps': 'off', // Sometimes fails due to timeouts: https://github.com/GoogleChrome/lighthouse/issues/6512
				'csp-xss': 'off', // Disable because if unsafe-inline is present, nonces aren't generated (https://github.com/sveltejs/kit/pull/11613)
				'color-contrast': 'off', // Neon flickering triggers this
				'aria-valid-attr-value': 'off' // Melt adds some invalid aria tags
			}
		}
	}
};
