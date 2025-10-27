/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	},
	testDir: 'tests',
	// Only run .spec.js files that are NOT in integration, client, or contract directories
	testMatch: /\.e2e\.spec\.js$/
};

export default config;
