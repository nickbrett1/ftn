const BundleTracker = require('webpack-bundle-tracker');
const path = require('path');
const fs = require('fs');

module.exports = {
  context: __dirname,
  entry: {
    main: './main/src/App.jsx',
  },
  mode: 'development',
  output: {
    path: path.resolve('./assets/webpack_bundles/'),
    filename: '[name]-[contenthash].js',
  },
  plugins: [
    new BundleTracker({ filename: './webpack-stats.json' }),
  ],
  devServer: {
    server: {
      type: 'https',
      options: {
        key: fs.existsSync('../localhost+2-key.pem') ? '../localhost+2-key.pem' : '/home/vscode/.local/lib/python3.8/site-packages/sslserver/certs/development.key',
        cert: fs.existsSync('../localhost+2.pem') ? '../localhost+2.pem' : '/home/vscode/.local/lib/python3.8/site-packages/sslserver/certs/development.crt',
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
        use: [
          { loader: 'babel-loader' },
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.css$/,
        use: 'css-loader'
      }
    ],
  },
  resolve: {
    extensions: ['.jsx', '...'],
  },
};
