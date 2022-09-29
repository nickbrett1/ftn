const path = require('path');

module.exports = {
  entry: './workers/_worker.js',
  devtool: 'source-map',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, './workers/out'),
    filename: '_worker-bundle.js',
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
};
