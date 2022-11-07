const generateUriBase = (url, env) => {
  if (env.SENTRY_ENVIRONMENT === 'development') {
    // Needed to forece the redirect to port 8787 for the worker, not 3000
    return 'http://localhost:8787';
  }
  return `${url.origin}`;
};

export default generateUriBase;
