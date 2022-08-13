import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import Button from '@mui/material/Button';
import GoogleIcon from '@mui/icons-material/Google';

function Login() {

  const login = useGoogleLogin({
    onSuccess: tokenResponse => console.log(tokenResponse)
  })

  return (
      <Button 
        variant='contained' 
        color='primary'
        size='large'
        startIcon={<GoogleIcon/>}>
          Login
      </Button>
  );
}

export default Login;
