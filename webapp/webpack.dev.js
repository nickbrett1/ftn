const { resolve } = require('path');
const { merge } = require('webpack-merge');
const { existsSync } = require('fs');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'cheap-source-map',
  devServer: {
    server: {
      type: 'https',
      options: {
        key: existsSync('../localhost+2-key.pem')
          ? '../localhost+2-key.pem'
          : '/home/vscode/.local/lib/python3.8/site-packages/sslserver/certs/development.key',
        cert: existsSync('../localhost+2.pem')
          ? '../localhost+2.pem'
          : '/home/vscode/.local/lib/python3.8/site-packages/sslserver/certs/development.crt',
      },
    },
    client: {
      overlay: true,
    },
    devMiddleware: {
      index: true,
      mimeTypes: { phtml: 'text/html' },
      publicPath: resolve('./assets/webpack_bundles/'),
      serverSideRender: true,
      writeToDisk: true,
    },
  },
  plugins: [new CleanWebpackPlugin(), new BundleAnalyzerPlugin()],
});
