const { merge } = require('webpack-merge');
const SentryWebpackPlugin = require('@sentry/webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const path = require('path');
const common = require('./webpack.common');

module.exports = (env) =>
  merge(common, {
    mode: 'production',
    devtool: 'source-map',
    optimization: {
      concatenateModules: !env.ANALYZE,
    },
    plugins: [
      new SentryWebpackPlugin({
        org: 'nick-brett',
        include: path.resolve('./assets/webpack_bundles/'),
        ignoreFile: '.sentrycliignore',
        ignore: ['node_modules', 'webpack.config.js'],
        project: 'bem-frontend',
        release: process.env.CF_PAGES_COMMIT_SHA,
      }),
      new BundleAnalyzerPlugin({
        analyzerMode: env.ANALYZE ? 'server' : 'none',
      }),
    ],
  });
