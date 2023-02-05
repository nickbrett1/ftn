// This file sets a custom webpack configuration to use your Next.js app
// with Sentry.
// https://nextjs.org/docs/api-reference/next.config.js/introduction
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

const { withSentryConfig } = require('@sentry/nextjs');
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const generateCSP = () => {
  const policy = {};

  const add = (directive, value, options = {}) => {
    if (options.devOnly && process.env.NODE_ENV !== 'development') return;
    const curr = policy[directive];
    policy[directive] = curr ? [...curr, value] : [value];
  };

  add('default-src', `'none'`);
  add('connect-src', `'self'`);
  add('connect-src', 'https://*.ingest.sentry.io');
  add('connect-src', 'https://sentry.io/');
  add('connect-src', 'https://fonts.googleapis.com');
  add('connect-src', 'https://fonts.gstatic.com');
  add('connect-src', 'https://cloudflareinsights.com');
  add('connect-src', 'https://static.cloudflareinsights.com');
  add('connect-src', 'https://accounts.google.com/gsi/');
  add('connect-src', 'https://res.cloudinary.com');
  add('font-src', 'https://fonts.gstatic.com');
  add('font-src', 'data:');
  add('font-src', `'self'`);
  add('frame-src', 'https://accounts.google.com/gsi/');
  add('img-src', `'self'`);
  add(
    'img-src',
    'https://raw.githubusercontent.com/dotansimha/graphql-yoga/main/website/public/favicon.ico'
  );
  add('img-src', 'data:');
  add('img-src', 'https://res.cloudinary.com');
  add('manifest-src', `'self'`);
  add('media-src', `'self'`);
  add('media-src', 'https://ssl.gstatic.com');
  add('script-src', `'unsafe-eval'`, { devOnly: true });
  add('script-src', 'https://unpkg.com/@graphql-yoga', { devOnly: true });
  add('script-src-elem', `'self'`);
  add('script-src-elem', 'https://static.cloudflareinsights.com');
  add('script-src-elem', 'https://*.ingest.sentry.io');
  add('script-src-elem', 'https://sentry.io/api/');
  add('script-src-elem', 'https://accounts.google.com/gsi/client');
  add('script-src-elem', 'https://unpkg.com/@graphql-yoga/', { devOnly: true });
  add('script-src-elem', `'unsafe-inline'`);
  add('style-src', `'unsafe-inline'`);
  add('style-src', `'self'`);
  add('style-src', 'https://fonts.googleapis.com');
  add('style-src', 'https://accounts.google.com/gsi/style');
  add('style-src', 'https://unpkg.com/@graphql-yoga/');
  add('worker-src', `'self'`);

  return Object.entries(policy)
    .map(([key, value]) => `${key} ${value.join(' ')}`)
    .join('; ');
};

const moduleExports = withPWA({
  sentry: {
    hideSourceMaps: true,
  },
  compress: true,
  reactStrictMode: true,
  experimental: {
    legacyBrowsers: false,
    appDir: true,
    runtime: 'experimental-edge',
  },

  images: {
    loader: 'cloudinary',
    path: 'https://res.cloudinary.com/dnwdr35zg/image/upload/',
  },
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        __SENTRY_DEBUG__: false,
        __SENTRY_TRACING__: false,
      })
    );

    // return the modified config
    return config;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: generateCSP(),
          },
        ],
      },
    ];
  },
});

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore

  silent: true, // Don't show logs
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
};

if (process.env.ANALYZE) {
  // eslint-disable-next-line global-require
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });

  sentryWebpackPluginOptions.dryRun = true;

  module.exports = withSentryConfig(
    withBundleAnalyzer(moduleExports),
    sentryWebpackPluginOptions
  );
} else {
  // Make sure adding Sentry options is the last code to run before exporting, to
  // ensure that your source maps include changes from all other Webpack plugins

  module.exports = withSentryConfig(moduleExports, sentryWebpackPluginOptions);
}
