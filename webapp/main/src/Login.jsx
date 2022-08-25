import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import jwtDecode from 'jwt-decode';

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
