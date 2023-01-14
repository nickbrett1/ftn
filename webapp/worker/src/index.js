/**
 * British Empire Management Cloudflare Worker entry point
 * Lots copied from https://apiumhub.com/tech-blog-barcelona/implementing-google-oauth-google-api-cloudflare-workers/
 */
import { Toucan } from 'toucan-js';
import { createYoga } from 'graphql-yoga';
import generateCSP from './generate-csp';
import { processAuth, processLogout } from './auth';
import generateUriBase from './uri';
import schema from './schema';

const yoga = createYoga({
  schema,
});

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
        case '/graphql': {
          response = await yoga.handleRequest(request, env);
          break;
        }
        case '/auth': {
          response = await processAuth(url, env);
          break;
        }
        case '/home':
        case '/logout': {
          const cookies = request.headers.get('cookie');
          if (!cookies) {
            response = Response.redirect(
              `${generateUriBase(url, env)}/preview`,
              HTML_TEMPORARY_REDIRECT
            );
            break;
          }

          const authCookie = cookies.match(/auth=([^;]+)/);
          if (!authCookie) {
            response = Response.redirect(
              `${generateUriBase(url, env)}/preview`,
              HTML_TEMPORARY_REDIRECT
            );
            break;
          }
          const authCookieKey = authCookie[1];

          const accessToken = await env.KV.get(authCookieKey);
          if (accessToken === null) {
            response = Response.redirect(
              `${generateUriBase(url, env)}/preview`,
              HTML_TEMPORARY_REDIRECT
            );
            break;
          }

          if (url.pathname === '/logout') {
            response = await processLogout(
              url,
              env,
              context,
              accessToken,
              authCookieKey
            );
            break;
          }

          response = await fetch(request);
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
