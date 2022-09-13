module.exports = {
  ci: {
    collect: {
      staticDistDir: './assets/webpack_bundles',
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
