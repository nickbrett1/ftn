import sentryPlugin from '@cloudflare/pages-plugin-sentry';
import createSentryConfig from '../sentry/sentry';

// export const onRequestHead = [headerSetup];

const hello = async ({ next }) => {
  const response = await next();
  response.headers.set('X-Hello', 'Hello from functions Middleware!');
  return response;
};

export const onRequest = [sentryPlugin(createSentryConfig()), hello];
export default {};
