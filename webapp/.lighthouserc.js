module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run staging',
      startServerReadyPattern: 'Starting a local server...',
      url: [
        'http://localhost:8787',
        'http://localhost:8787/404',
        'http://localhost:8787/500',
        'http://localhost:8787/nojs',
      ],
      settings: {
        cpuSlowdownMultiplier: 2.4,
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      preset: 'lighthouse:recommended',
    },
  },
};
