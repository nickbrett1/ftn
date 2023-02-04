module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run staging',
      startServerReadyPattern: 'Starting a local server...',
      url: ['http://localhost:8787', 'http://localhost:8787/home'],
      settings: {
        cpuSlowdownMultiplier: 2.4,
        chromeFlags: '--no-sandbox',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'uses-text-compression': 'off', // Disabled until this is fixed: https://github.com/vercel/next.js/issues/43106
        'service-worker': 'off', // Disabled until this is fixed: https://github.com/shadowwalker/next-pwa/pull/427
        'unused-javascript': 'off', // Unecessary with SSR and streaming
      },
    },
  },
};
