export {}; // Ensure the file is treated as a module

import { Configuration as WebpackConfig } from 'webpack';
import webpack from 'webpack'; // Import Webpack to use the ProvidePlugin

export default {
  webpack: {
    configure: (webpackConfig: WebpackConfig) => {
      // Ensure webpackConfig.resolve is defined
      webpackConfig.resolve = webpackConfig.resolve || {};

      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "path": require.resolve("path-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "process": require.resolve("process/browser.js"), // Use .js extension
      };

      webpackConfig.plugins = [
        ...(webpackConfig.plugins || []),
        new webpack.ProvidePlugin({
          process: 'process/browser.js', // Use .js extension
        }),
      ];

      return webpackConfig;
    },
  },
};
