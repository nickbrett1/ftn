module.exports = {
  ci: {
    collect: {
      staticDistDir: './assets/webpack_bundles',
      url: 'http://localhost:46657',
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
