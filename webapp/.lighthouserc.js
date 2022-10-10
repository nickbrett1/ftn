module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run wrangler-staging && npm run start',
      startServerReadyPattern: 'Starting a local server...',
      url: ['http://localhost:8787'],
      settings: {
        cpuSlowdownMultiplier: 2.4,
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'service-worker': 'off',
      },
    },
  },
};
