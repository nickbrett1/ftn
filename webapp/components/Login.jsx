import React from 'react';
import jwtDecode from 'jwt-decode';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  return (
    <GoogleLogin
      theme="filled_black"
      size="large"
      text="signin"
      onSuccess={(credentialResponse) => {
        jwtDecode(credentialResponse.credential);
      }}
      onError={() => {}}
      useOneTap
    />
  );
}
