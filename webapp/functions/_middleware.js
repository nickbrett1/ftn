import sentryPlugin from '@cloudflare/pages-plugin-sentry';

// export const onRequestHead = [headerSetup];

const hello = async ({ next }) => {
  const response = await next();
  response.headers.set('X-Hello', 'Hello from functions Middleware!');
  return response;
};

export const onRequest = [
  sentryPlugin({
    dsn: 'https://09dfa4a627e04814b584374fe183c61d@o1381755.ingest.sentry.io/6778159',

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0,
    attachStacktrace: true,

    allowedHeaders: ['user-agent'],
    allowedSearchParams: /(.*)/,

    // ...
    // Note: if you want to override the automatic release value, do not set a
    // `release` value here - use the environment variable `SENTRY_RELEASE`, so
    // that it will also get attached to your source maps
  }),
  hello,
];
export default {};
