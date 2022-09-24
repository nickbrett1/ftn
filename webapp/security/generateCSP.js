const generateCSP = () => {
  const policy = {};

  const add = (directive, value, options = {}) => {
    if (options.devOnly && process.env.NODE_ENV !== 'development') return;
    const curr = policy[directive];
    policy[directive] = curr ? [...curr, value] : [value];
  };

  add('default-src', `'none'`);

  add('script-src', `'self'`);
  add('script-src', `'unsafe-eval'`, { devOnly: true });

  // Needs server side support: https://zhuhaow.me/deploy-full-nextjs-site-on-cloudflare-are-we-there-yet
  // add('script-src', `'nonce-random123'`);
  // add('script-src', `'strict-dynamic'`);

  add('connect-src', `'self'`, { devOnly: true });
  add('connect-src', 'https://*.ingest.sentry.io');
  add('style-src', 'https://fonts.googleapis.com');
  add('style-src', `'unsafe-inline'`);
  add('manifest-src', `'self'`);
  add('img-src', `'self'`);
  add('font-src', 'https://fonts.gstatic.com');
  add('base-uri', `'none'`);
  add('form-action', `'self'`);
  add('object-src', `'none'`);

  // return the object in a formatted value (this won't work on IE11 without a polyfill!)
  return Object.entries(policy)
    .map(([key, value]) => `${key} ${value.join(' ')}`)
    .join('; ');
};

export default generateCSP;
