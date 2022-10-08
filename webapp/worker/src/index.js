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
      let response = await fetch(request);

      // Clone the response so that it's no longer immutable
      response = new Response(response.body, response);

      // Add a custom header with a value
      response.headers.append('x-workers-hello', 'I HAVE THE POWER');

      throw new Error('Do redirects work?');

      return response;
    } catch (err) {
      sentry.captureException(err);

      const HTML_TEMPORARY_REDIRECT = 307;
      return Response.redirect(
        'https://bemstudios.uk/500.html',
        HTML_TEMPORARY_REDIRECT
      );
    }
  },
};
