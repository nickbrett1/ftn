const generateCSP = (env) => {
  const policy = {};

  const add = (directive, value, options = {}) => {
    if (options.devOnly && env.SENTRY_ENVIRONMENT !== 'development') return;
    const curr = policy[directive];
    policy[directive] = curr ? [...curr, value] : [value];
  };

  add('default-src', `'none'`);
  add('connect-src', `'self'`);
  add('connect-src', 'https://*.ingest.sentry.io');
  add('connect-src', 'https://sentry.io/');
  add('connect-src', 'https://fonts.googleapis.com');
  add('connect-src', 'https://fonts.gstatic.com');
  add('connect-src', 'https://cloudflareinsights.com');
  add('connect-src', 'https://static.cloudflareinsights.com');
  add('connect-src', 'https://accounts.google.com/gsi/');
  add('font-src', 'https://fonts.gstatic.com');
  add('font-src', 'data:');
  add('font-src', `'self'`);
  add('frame-src', 'https://accounts.google.com/gsi/');
  add('img-src', `'self'`);
  add(
    'img-src',
    'https://raw.githubusercontent.com/dotansimha/graphql-yoga/main/website/public/favicon.ico'
  );
  add('img-src', 'data:');
  add('manifest-src', `'self'`);
  add('media-src', `'self'`);
  add('media-src', 'https://ssl.gstatic.com');
  add('script-src', `'unsafe-eval'`, { devOnly: true });
  add('script-src', 'https://unpkg.com/@graphql-yoga', { devOnly: true });
  add('script-src-elem', `'self'`);
  add('script-src-elem', 'https://static.cloudflareinsights.com');
  add('script-src-elem', 'https://*.ingest.sentry.io');
  add('script-src-elem', 'https://sentry.io/api/');
  add('script-src-elem', 'https://accounts.google.com/gsi/client');
  add('script-src-elem', 'https://unpkg.com/@graphql-yoga/', { devOnly: true });
  add('script-src-elem', `'unsafe-inline'`, { devOnly: true });
  add('style-src', `'unsafe-inline'`);
  add('style-src', `'self'`);
  add('style-src', 'https://fonts.googleapis.com');
  add('style-src', 'https://accounts.google.com/gsi/style');
  add('style-src', 'https://unpkg.com/@graphql-yoga/');
  add('worker-src', `'self'`);

  return Object.entries(policy)
    .map(([key, value]) => `${key} ${value.join(' ')}`)
    .join('; ');
};

export default generateCSP;
