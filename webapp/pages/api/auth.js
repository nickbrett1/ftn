const HTML_TEMPORARY_REDIRECT = 307;

const isUserAllowed = async (token) => {
  const url = new URL('https://www.googleapis.com/oauth2/v2/userinfo');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const userInfo = await response.json();
  if (userInfo.error) throw new Error(userInfo.error);
  if (!userInfo.verified_email) return false;

  return (await process.env.KV.get(userInfo.email)) === 'allowed';
};

const tokenExchange = async (url, code) => {
  const body = new URLSearchParams();

  if (!process.env.GOOGLE_CLIENT_SECRET)
    throw new Error('Must set GOOGLE_CLIENT_SECRET');

  if (!process.env.GOOGLE_CLIENT_ID)
    throw new Error('Must set GOOGLE_CLIENT_ID');

  const params = {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,

    code,
    grant_type: 'authorization_code',
    redirect_uri: `${url.origin}/api/auth`,
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
  if (resp.error) throw new Error(resp.error_description);
  return resp;
};

// Convert each uint8 (range 0 to 255) to string in base 36 (0 to 9, a to z)
const generateAuth = () =>
  [...crypto.getRandomValues(new Uint8Array(20))]
    .map((m) => m.toString(36).padStart(2, '0'))
    .join('');

export default async function handler(req) {
  const url = new URL(req.url);
  const { searchParams } = url;

  const error = searchParams.get('error');
  if (error !== null) throw new Error(error);

  const code = searchParams.get('code');
  if (code === null) throw new Error('No code found in auth response');

  const tokenResponse = await tokenExchange(url, code);

  const allowed = await isUserAllowed(tokenResponse.access_token);
  if (!allowed) {
    return Response.redirect(`${url.origin}/preview`, HTML_TEMPORARY_REDIRECT);
  }

  const newAuth = generateAuth();
  const expiration = new Date(Date.now() + tokenResponse.expires_in * 1000);

  await process.env.KV.put(newAuth, tokenResponse.access_token, {
    expiration: Math.floor(expiration / 1000),
  });

  return new Response('', {
    status: HTML_TEMPORARY_REDIRECT,
    headers: {
      Location: `${url.origin}/home`,
      'Set-Cookie': `auth=${newAuth}; expires=${expiration.toUTCString()}; secure;`,
    },
  });
}
