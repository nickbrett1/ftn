const path = require('path');

module.exports = {
  entry: './workers/_worker.js',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, './out'),
    filename: '_worker.js',
  },
};
