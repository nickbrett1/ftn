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

// Convert each uint8 (range 0 to 255) to string in base 36 (0 to 9, a to z)
const generateAuth = () =>
  [...crypto.getRandomValues(new Uint8Array(20))]
    .map((m) => m.toString(36).padStart(2, '0'))
    .join('');

const auth = async (url, env) => {
  const error = url.searchParams.get('error');
  if (error !== null) throw new Error(error);

  const code = url.searchParams.get('code');
  if (code === null) throw new Error('No code found in auth response');

  const tokenResponse = await tokenExchange(url, env, code);
  console.log(
    '🚀 ~ file: auth.js ~ line 50 ~ auth ~ tokenResponse',
    tokenResponse
  );

  // Check if user is allowed - call userInfo API for email address

  const newAuth = generateAuth();
  const expiration = new Date(Date.now() + tokenResponse.expires_in * 1000);

  // save NewUath, tokenResponse.access_token, Math.floor(expiration / 1000) to KV
  // store refresh token in KV

  const HTML_TEMPORARY_REDIRECT = 302;
  return new Response('', {
    status: HTML_TEMPORARY_REDIRECT,
    headers: {
      Location: `${generateUriBase(url, env)}/home`,
      'Set-Cookie': `auth=${newAuth}; expires=${expiration.toUTCString()}; secure; HttpOnly;`,
    },
  });
};
export default auth;
