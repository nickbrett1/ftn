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
import generateUriBase from './uri';

export default {
  async fetch(request, env, context) {
    const sentry = new Toucan({
      dsn: env.SENTRY_BACKEND_DSN,
      context, // Includes 'waitUntil', which is essential for Sentry logs to  be delivered. Modules workers do not include 'request' in context -- you'll need to set it separately.
      request, // request is not included in 'context', so we set it here.
      allowedHeaders: ['user-agent'],
      allowedSearchParams: /(.*)/,
      release: env.SENTRY_RELEASE,
      environment: env.SENTRY_ENVIRONMENT,
      rewriteFrames: {
        root: '/',
      },
    });

    const HTML_TEMPORARY_REDIRECT = 307;
    const url = new URL(request.url);
    try {
      let response;

      switch (url.pathname) {
        case '/auth': {
          response = await auth(url, env);
          break;
        }
        case '/home': {
          console.log('Checking cookies');
          const cookies = request.headers.get('cookie');
          if (!cookies || !cookies.includes('auth')) {
            console.log('No token found in cookies');
            response = Response.redirect(
              generateUriBase(url, env),
              HTML_TEMPORARY_REDIRECT
            );
          } else {
            console.log('Token found in cookies');
            response = await fetch(request);
          }
          break;
        }
        case '/logout': {
          response = new Response('Logged out');
          break;
        }
        default:
          response = await fetch(request);
      }

      response = new Response(response.body, response);
      response.headers.append('Content-Security-Policy', generateCSP(env));
      return response;
    } catch (err) {
      sentry.captureException(err);

      if (env.SENTRY_ENVIRONMENT === 'development') {
        throw err;
      }

      const redirectURI = `${url.origin}/500`;
      return Response.redirect(redirectURI, HTML_TEMPORARY_REDIRECT);
    }
  },
};
