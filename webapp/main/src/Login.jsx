import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import SvgIcon from '@mui/material/SvgIcon';
import Button from '@mui/material/Button';
import jwtDecode from 'jwt-decode';

export default function Login() {
  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      jwtDecode(codeResponse);
    },
    onError: () => {},
    flow: 'auth-code',
  });

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
      onClick={() => login()}
    >
      Login
    </Button>
  );
}
