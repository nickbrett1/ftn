import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Button } from '@mui/material';
import jwtDecode from 'jwt-decode';
import GoogleIcon from '@mui/icons-material/Google';

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
      startIcon={<GoogleIcon />}
      onClick={() => login()}
    >
      Login
    </Button>
  );
}
