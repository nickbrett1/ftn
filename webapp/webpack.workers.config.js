const path = require('path');

module.exports = {
  entry: './workers/_worker.js',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, './workers'),
    filename: '_worker-bundle.js',
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
};
