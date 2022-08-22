import React from 'react';
import { GoogleLogin } from '@react-oauth/google';

function Login() {
  return (
    <GoogleLogin
      theme="filled_black"
      size="large"
      text="signin"
      onSuccess={(credentialResponse) => {
        console.log(credentialResponse);
      }}
      onError={() => {
        console.log('Login Failed');
      }}
      useOneTap
    />
  );
}

export default Login;
