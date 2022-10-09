module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start && npm run wrangler-local',
      startServerReadyPattern: 'ready on',
      staticDistDir: './out',
      url: [
        'http://localhost:8787',
        'http://localhost:8787/404',
        'http://localhost:8787/500',
        'http://localhost:8787/nojs',
      ],
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
