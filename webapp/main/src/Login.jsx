import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import Button from '@mui/material/Button';

function Login() {

  const login = useGoogleLogin({
    onSuccess: tokenResponse => console.log(tokenResponse)
  })

  return (
      <Button variant='contained' size='large'>Log in</Button>
  );
}

export default Login;
