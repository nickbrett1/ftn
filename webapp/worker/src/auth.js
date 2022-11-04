const tokenExchange = async (url, env, code) => {
  const body = new URLSearchParams();
  let redirectURI = `${url.origin}/auth`;

  if (env.SENTRY_ENVIRONMENT === 'development') {
    redirectURI = 'http://localhost:8787/auth';
  }

  if (!env.GOOGLE_CLIENT_SECRET)
    throw new Error('Must set GOOGLE_CLIENT_SECRET');

  if (!env.GOOGLE_CLIENT_ID) throw new Error('Must set GOOGLE_CLIENT_ID');

  const params = {
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,

    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectURI,
  };

  Object.entries(params).forEach(([key, value]) => {
    body.append(key, value);
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const resp = await response.json();
  if (resp.error) throw new Error(resp.error);
  return resp;
};

const auth = async (url, env) => {
  const error = url.searchParams.get('error');
  if (error !== null) throw new Error(error);

  const code = url.searchParams.get('code');
  if (code === null) throw new Error('No code found in auth response');

  await tokenExchange(url, env, code);

  const HTML_TEMPORARY_REDIRECT = 302;
  return Response.redirect(
    env.SENTRY_ENVIRONMENT === 'development'
      ? 'http://localhost:8787/home'
      : 'https://bemstudios.uk/home',
    HTML_TEMPORARY_REDIRECT
  );
};
export default auth;
