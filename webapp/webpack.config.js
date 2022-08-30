const BundleTracker = require('webpack-bundle-tracker');
const WebpackFavicons = require('webpack-favicons');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SentryWebpackPlugin = require('@sentry/webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ProgressPlugin = require('progress-webpack-plugin');
const BundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const path = require('path');
const fs = require('fs');

module.exports = {
  context: __dirname,
  entry: './main/src/App.jsx',
  devtool: 'source-map',
  output: {
    path: path.resolve('./assets/webpack_bundles/'),
    publicPath: '/static/webpack_bundles/',
    filename: '[name]-[contenthash].js',
  },
  plugins: [
    new CleanWebpackPlugin(),
    new ProgressPlugin(true),
    new BundleTracker({ filename: './webpack-stats.json' }),
    new BundleAnalyzerPlugin(),
    new WebpackFavicons({
      src: './main/src/images/flag.svg',
      appName: 'British Empire Management',
      appShortName: 'BEM',
      appDescription: 'British Empire Management',
      scope: '/',
      icons: {
        android: true,
        appleIcon: true,
        appleStartup: true,
        favicons: true,
        windows: true,
        yandex: true,
      },
    }),
    new HtmlWebpackPlugin({
      template: './main/templates/main/index.html',
      title: 'British Empire Management',
      filename: 'index.html',
      publicPath: '/static/webpack_bundles',
      templateParameters: {
        debug: process.env.DEBUG,
      },
      meta: {
        charset: 'utf-8',
        viewport: 'width=device-width, initial-scale=1',
      },
    }),
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
  devServer: {
    server: {
      type: 'https',
      options: {
        key: fs.existsSync('../localhost+2-key.pem')
          ? '../localhost+2-key.pem'
          : '/home/vscode/.local/lib/python3.8/site-packages/sslserver/certs/development.key',
        cert: fs.existsSync('../localhost+2.pem')
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
      publicPath: path.resolve('./assets/webpack_bundles/'),
      serverSideRender: true,
      writeToDisk: true,
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.css$/,
        use: 'css-loader',
      },
      {
        test: /\.ico$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext][query]',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.jsx', '...'],
  },
};
