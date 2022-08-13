import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import Button from '@mui/material/Button';

function Login() {

  const login = useGoogleLogin({
    onSuccess: tokenResponse => console.log(tokenResponse)
  })

  return (
      <Button 
        variant='contained' 
        color='primary'
        size='large'>
          Login
      </Button>
  );
}

export default Login;
