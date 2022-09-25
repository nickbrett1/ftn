export default function createSentryConfig(dsn) {
  return {
    dsn:
      dsn ||
      'https://2becbe2880ce41ed8198fd63c2cd490f@o1381755.ingest.sentry.io/6695436',
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0,
    attachStacktrace: true,
    // ...
    // Note: if you want to override the automatic release value, do not set a
    // `release` value here - use the environment variable `SENTRY_RELEASE`, so
    // that it will also get attached to your source maps
  };
}
