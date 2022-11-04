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
  add('connect-src', 'https://fonts.googleapis.com');
  add('connect-src', 'https://fonts.gstatic.com');
  add('connect-src', 'https://cloudflareinsights.com');
  add('connect-src', 'https://accounts.google.com/gsi/');
  add('font-src', 'https://fonts.gstatic.com');
  add('frame-src', 'https://accounts.google.com/gsi/');
  add('img-src', `'self'`);
  add('manifest-src', `'self'`);
  add('script-src', `'unsafe-eval'`, { devOnly: true });
  add('script-src-elem', `'self'`);
  add('script-src-elem', 'https://static.cloudflareinsights.com');
  add('script-src-elem', 'https://accounts.google.com/gsi/client');
  add('style-src', `'unsafe-inline'`);
  add('style-src', 'https://fonts.googleapis.com');
  add('style-src', 'https://accounts.google.com/gsi/style');
  add('worker-src', `'self'`);

  return Object.entries(policy)
    .map(([key, value]) => `${key} ${value.join(' ')}`)
    .join('; ');
};

export default generateCSP;
