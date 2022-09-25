import sentryPlugin from '@cloudflare/pages-plugin-sentry';
import createSentryConfig from '../sentry/sentry';

export default async function onRequest() {
  return sentryPlugin(createSentryConfig());
}
