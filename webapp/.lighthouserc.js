module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      assertions: {
        'uses-long-cache-ttl': 'off',
        'service-worker': 'off',
      },
    },
  },
};
