const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve.fallback = {
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        crypto: require.resolve('crypto-browserify'),
        process: require.resolve('process/browser'),
      };

      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );

      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'process/browser': require.resolve('process/browser.js'), 
        process: require.resolve('process/browser.js'),
      };

      config.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });

      config.ignoreWarnings = [
        {
          message: /Failed to parse source map/,
        },
      ];

      config.devtool = false;

      return config;
    },
  },
};
