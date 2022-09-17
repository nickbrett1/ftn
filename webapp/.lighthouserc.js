module.exports = {
  ci: {
    collect: {
      staticDistDir: './assets/webpack_bundles',
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'uses-long-cache-ttl': 'off',
        
      },
    },
  },
};
