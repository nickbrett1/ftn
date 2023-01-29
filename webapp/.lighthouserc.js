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
        'uses-responsive-images': 'off',
      },
    },
  },
};
