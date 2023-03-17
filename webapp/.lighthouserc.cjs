module.exports = {
	ci: {
		collect: {
			startServerCommand: 'npm run preview',
			startServerReadyPattern: 'preview',
			url: ['http://localhost:4173', 'http://localhost:4173/home'],
			settings: {
				cpuSlowdownMultiplier: 2.4,
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
