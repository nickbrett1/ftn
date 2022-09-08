const BundleTracker = require('webpack-bundle-tracker');
const WebpackFavicons = require('webpack-favicons');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const path = require('path');

module.exports = {
  context: __dirname,
  entry: './main/src/App.jsx',
  output: {
    path: path.resolve('./assets/webpack_bundles/'),
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
      templateParameters: {
        debug: process.env.DEBUG,
        release: process.env.CF_PAGES_COMMIT_SHA,
      },
      meta: {
        charset: 'utf-8',
        viewport: 'width=device-width, initial-scale=1',
      },
    }),
  ],
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
