const { merge } = require('webpack-merge');
const SentryWebpackPlugin = require('@sentry/webpack-plugin');

const path = require('path');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  plugins: [
    new SentryWebpackPlugin({
      org: 'nick-brett',
      include: path.resolve('./assets/webpack_bundles/'),
      ignoreFile: '.sentrycliignore',
      ignore: ['node_modules', 'webpack.config.js'],
      project: 'bem-frontend',
      urlPrefix: '~/assets/webpack_bundles/',
      release: process.env.CF_PAGES_COMMIT_SHA,
    }),
  ],
});
