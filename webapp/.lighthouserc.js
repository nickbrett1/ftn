module.exports = {
  ci: {
    collect: {
      staticDistDir: './assets/webpack_bundles',
      url: 'http://localhost',
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
