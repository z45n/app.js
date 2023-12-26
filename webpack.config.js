const path = require('path');

module.exports = {
  entry: './src/index.js', // Entry point of your application
  output: {
    filename: 'bundle.js', // Output file name
    path: path.resolve(__dirname, 'dist'), // Output directory
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Apply the loader to all JavaScript files
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Use Babel for JavaScript transpilation
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};
