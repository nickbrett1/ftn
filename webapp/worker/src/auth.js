import generateUriBase from './uri';

const tokenExchange = async (url, env, code) => {
  const body = new URLSearchParams();

  if (!env.GOOGLE_CLIENT_SECRET)
    throw new Error('Must set GOOGLE_CLIENT_SECRET');

  if (!env.GOOGLE_CLIENT_ID) throw new Error('Must set GOOGLE_CLIENT_ID');

  const params = {
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,

    code,
    grant_type: 'authorization_code',
    redirect_uri: `${generateUriBase(url, env)}/auth`,
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

const revokeGoogleToken = async (token) => {
  const body = new URLSearchParams();
  body.append('token', token);

  const response = await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (response.status !== 200) {
    const resp = await response.text();
    throw new Error(resp);
  }
};

const isUserAllowed = async (token, env) => {
  const url = new URL('https://www.googleapis.com/oauth2/v2/userinfo');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const userInfo = await response.json();
  if (userInfo.error) throw new Error(userInfo.error);
  if (!userInfo.verified_email) return false;

  return (await env.KV.get(userInfo.email)) === 'allowed';
};

// Convert each uint8 (range 0 to 255) to string in base 36 (0 to 9, a to z)
const generateAuth = () =>
  [...crypto.getRandomValues(new Uint8Array(20))]
    .map((m) => m.toString(36).padStart(2, '0'))
    .join('');

const HTML_TEMPORARY_REDIRECT = 307;
export const processAuth = async (url, env) => {
  const error = url.searchParams.get('error');
  if (error !== null) throw new Error(error);

  const code = url.searchParams.get('code');
  if (code === null) throw new Error('No code found in auth response');

  const tokenResponse = await tokenExchange(url, env, code);

  const allowed = await isUserAllowed(tokenResponse.access_token, env);
  if (!allowed) {
    return Response.redirect(
      `${generateUriBase(url, env)}/preview`,
      HTML_TEMPORARY_REDIRECT
    );
  }

  const newAuth = generateAuth();
  const expiration = new Date(Date.now() + tokenResponse.expires_in * 1000);

  await env.KV.put(newAuth, tokenResponse.access_token, {
    expiration: Math.floor(expiration / 1000),
  });

  return new Response('', {
    status: HTML_TEMPORARY_REDIRECT,
    headers: {
      Location: `${generateUriBase(url, env)}/home`,
      'Set-Cookie': `auth=${newAuth}; expires=${expiration.toUTCString()}; secure;`,
    },
  });
};

export const processLogout = async (
  url,
  env,
  context,
  token,
  authCookieKey
) => {
  context.waitUntil(
    Promise.allSettled([revokeGoogleToken(token), env.KV.delete(authCookieKey)])
  );

  return new Response('', {
    status: HTML_TEMPORARY_REDIRECT,
    headers: {
      Location: `${generateUriBase(url, env)}`,
      'Set-Cookie': `auth=deleted; secure;`,
    },
  });
};
