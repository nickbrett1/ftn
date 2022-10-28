/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import Toucan from 'toucan-js';
import generateCSP from './generate-csp';
import auth from './auth';

export default {
  async fetch(request, environment, context) {
    const sentry = new Toucan({
      dsn: 'https://09dfa4a627e04814b584374fe183c61d@o1381755.ingest.sentry.io/6778159',
      context, // Includes 'waitUntil', which is essential for Sentry logs to  be delivered. Modules workers do not include 'request' in context -- you'll need to set it separately.
      request, // request is not included in 'context', so we set it here.
      allowedHeaders: ['user-agent'],
      allowedSearchParams: /(.*)/,
      // eslint-disable-next-line no-undef
      release: SENTRY_RELEASE,
      // eslint-disable-next-line no-undef
      environment: SENTRY_ENVIRONMENT,
      rewriteFrames: {
        root: '/',
      },
    });

    try {
      const url = new URL(request.url);

      let response;
      if (url.pathname === '/auth') {
        response = await auth(url, environment);
      } else {
        response = await fetch(request);
        response = new Response(response.body, response);
      }

      response.headers.append('Content-Security-Policy', generateCSP());
      return response;
    } catch (err) {
      sentry.captureException(err);

      // eslint-disable-next-line no-undef
      if (SENTRY_ENVIRONMENT === 'development') {
        throw err;
      }

      const HTML_TEMPORARY_REDIRECT = 307;
      return Response.redirect(
        'https://bemstudios.uk/500.html',
        HTML_TEMPORARY_REDIRECT
      );
    }
  },
};
