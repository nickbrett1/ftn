const BundleTracker = require('webpack-bundle-tracker');
const path = require('path');

module.exports = {
  context: __dirname,
  entry: {
    main: './main/src/App.jsx',
  },
  mode: 'development',
  output: {
    path: path.resolve('./assets/webpack_bundles/'),
    filename: '[name]-[hash].js',
    chunkFilename: '[name]-[hash].js',
  },
  plugins: [
    new BundleTracker({ filename: './webpack-stats.json' }),
  ],
  devServer: {
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
          { loader: 'babel-loader' },
        ],
      },
    ],
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.jsx'],
  },
};
