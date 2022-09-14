module.exports = {
  ci: {
    collect: {
      staticDistDir: './assets/webpack_bundles',
      url: 'https://localhost',
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
