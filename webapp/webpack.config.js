const BundleTracker = require('webpack-bundle-tracker');
const WebpackFavicons = require('webpack-favicons');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const fs = require('fs');

module.exports = {
  context: __dirname,
  entry: './main/src/App.jsx',
  mode: 'development',
  devtool: 'source-map',
  output: {
    path: path.resolve('./assets/webpack_bundles/'),
    publicPath: '/static/webpack_bundles/',
    filename: '[name]-[contenthash].js',
  },
  plugins: [
    new BundleTracker({ filename: './webpack-stats.json' }),
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
      meta: {
        charset: 'utf-8',
        viewport: 'width=device-width, initial-scale=1',
      },
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
        use: [{ loader: 'babel-loader' }],
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
