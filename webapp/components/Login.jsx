import React, { useState } from 'react';
import SvgIcon from '@mui/material/SvgIcon';
import Button from '@mui/material/Button';

export default function Login() {
  const [client, setClient] = useState(null);

  const login = () => {
    if (client) {
      client.requestAccessToken();
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

      const clientRef = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: `openid profile email`,
        callback: (response) => {
          if (response.error) {
            throw new Error('Failed to initTokenClient', response.error);
          }
        },
      });

      setClient(clientRef);
      clientRef.requestAccessToken();
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
