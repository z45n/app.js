const path = require('path');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'), // Change 'dist' to 'build' or another directory
  },
  
  module: {
    rules: [
      // ... existing rules

      // Add the rule to exclude C# files
      {
        test: /\.cs$/,
        use: 'ignore-loader',
      },
      // Add the rule to exclude HTML files
      {
        test: /\.html$/,
        use: 'ignore-loader',
      },
    ],
  },
  resolve: {
    fallback: {
      url: require.resolve('url/'),
      path: require.resolve('path-browserify'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      assert: require.resolve('assert/'),
      fs: false,
      zlib: require.resolve('browserify-zlib'),
      querystring: require.resolve('querystring-es3'),
      http: require.resolve('stream-http'),
      net: false,
      tls: false,
      os: require.resolve('os-browserify/browser'),
      https: require.resolve('https-browserify'),
      async_hooks: require.resolve('async_hooks'),
      constants: false,
      timers: require.resolve('timers-browserify'),
      'timers/promises': require.resolve('timers-promises'), // Added line
      child_process: false,
      dgram: require.resolve('dgram-browserify'), // Added line
    

    },
},
mode: 'development', // Set mode to 'development'
stats: {
  errorDetails: true, // Enable detailed error details
},
};
