import React from 'react';
import SvgIcon from '@mui/material/SvgIcon';
import Button from '@mui/material/Button';
import Script from 'next/script';

export default function Login() {
  const login = () => {};

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" async defer />
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
    </>
  );
}
