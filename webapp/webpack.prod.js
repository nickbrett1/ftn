const { merge } = require('webpack-merge');
const SentryWebpackPlugin = require('@sentry/webpack-plugin');

const path = require('path');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'hidden-source-map',
  plugins: [
    new SentryWebpackPlugin({
      org: 'nick-brett',
      include: path.resolve('./assets/webpack_bundles/'),
      ignoreFile: '.sentrycliignore',
      ignore: ['node_modules', 'webpack.config.js'],
      configFile: 'sentry.properties',
      project: 'bem-frontend',
      urlPrefix: '~/static/webpack_bundles',
    }),
  ],
});
