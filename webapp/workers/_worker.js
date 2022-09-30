import Toucan from 'toucan-js';

export default {
  async fetch(request, environment, context) {
    const sentry = new Toucan({
      dsn: 'https://09dfa4a627e04814b584374fe183c61d@o1381755.ingest.sentry.io/6778159',
      context, // Includes 'waitUntil', which is essential for Sentry logs to be delivered. Modules workers do not include 'request' in context -- you'll need to set it separately.
      request, // request is not included in 'context', so we set it here.
      allowedHeaders: ['user-agent'],
      allowedSearchParams: /(.*)/,
      release: process.env.SENTRY_RELEASE,
    });

    try {
      let response = await environment.ASSETS.fetch(request);

      // Clone the response so that it's no longer immutable
      response = new Response(response.body, response);

      // Add a custom header with a value
      response.headers.append('x-workers-hello', 'I HAVE THE POWER');

      throw new Error('Something went really wrong in worker!');

      return response;
    } catch (err) {
      sentry.captureException(err);
      throw err;

      // TODO - redirect to 500.html
      return new Response('Something went wrong', {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }
  },
};
