import React, { useState } from 'react';
import SvgIcon from '@mui/material/SvgIcon';
import Button from '@mui/material/Button';
import { nanoid } from 'nanoid';

export default function Login() {
  const [client, setClient] = useState(null);

  const login = () => {
    if (client) {
      client.requestCode();
      return;
    }

    const script = document.createElement('script');

    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      const CLIENT_ID =
        '263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com';

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => {
          if (!response.credential || !response.clientId) {
            throw new Error('Failed to initialize google sign in');
          }
        },
      });

      const state = nanoid();
      sessionStorage.setItem('state', state);

      const clientRef = window.google.accounts.oauth2.initCodeClient({
        client_id: CLIENT_ID,
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
        },
      });

      setClient(clientRef);
      clientRef.requestCode();
    };

    script.onerror = () => {
      throw new Error('Google gsi script failed to load');
    };

    document.body.appendChild(script);
  };

  return (
    <Button
      variant="contained"
      color="primary"
      size="large"
      startIcon={
        <SvgIcon>
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </SvgIcon>
      }
      onClick={() => {
        login();
      }}
    >
      Login
    </Button>
  );
}
