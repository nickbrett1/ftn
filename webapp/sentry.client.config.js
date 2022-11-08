// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a page is visited.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn:
    SENTRY_DSN ||
    'https://2becbe2880ce41ed8198fd63c2cd490f@o1381755.ingest.sentry.io/6695436',
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,
  attachStacktrace: true,
  // ...
  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
  beforeSend: (event) => {
    // Check if it is an exception, and if so, show the report dialog
    if (event.exception) {
      Sentry.showReportDialog({ eventId: event.event_id });
    }
    return event;
  },
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    // Firefox extensions
    /^resource:\/\//i,
    // Safari extensions
    /^safari-extension:\/\//i,
    // Webpack dev server
    /webpack:\/\//i,
    // Sentry SDK internal calls
    /https:\/\/o1381755.ingest.sentry.io\/api\/6695436\/store\//i,
    // Next.js build loader
    /_next\/webpack-hmr/i,
    // Next.js dev server
    /http:\/\/localhost:3000\/_next\/webpack-hmr/i,
  ],
});
