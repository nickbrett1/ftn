import React, { useEffect, useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/router';

export default function Login() {
  const [client, setClient] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const router = useRouter();

  const onload = () => {
    const GOOGLE_CLIENT_ID =
      '263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com';

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (!response.credential || !response.clientId) {
          throw new Error('Failed to initialize google sign in');
        }
      },
    });

    const state = nanoid();

    const clientRef = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid profile email',
      ux_mode: 'redirect',
      state,
      redirect_uri:
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:8787/auth'
          : 'https://bemstudios.uk/auth',
      callback: (response) => {
        if (response.error) {
          throw new Error('Failed to initCodeClient', response.error);
        }
        if (response.state !== state) {
          throw new Error('State mismatch');
        }
      },
    });

    setClient(clientRef);
    clientRef.requestCode();
  };

  const onClick = useCallback(() => {
    if (loggedIn) {
      router.push('/home');
      return;
    }
    if (client) {
      client.requestCode();
      return;
    }

    const script = document.createElement('script');

    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = onload;
    script.onerror = () => {
      throw new Error('Google gsi script failed to load');
    };

    document.body.appendChild(script);
  }, [loggedIn, router, client]);

  useEffect(() => {
    const match = document.cookie.match(/(^| )auth=([^;]+)/);
    const hasValidAuth = match !== null && match[2] !== 'deleted';
    setLoggedIn(hasValidAuth);
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex rounded border border-blue-900 bg-blue-800 px-3 py-2 uppercase text-white hover:border-white hover:bg-blue-900"
    >
      <svg
        className="align-vertical mr-3 h-5 w-5 fill-current"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
      {loggedIn ? 'Home' : 'Login'}
    </button>
  );
}
