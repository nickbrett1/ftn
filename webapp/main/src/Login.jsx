import React from 'react';
import { GoogleLogin } from '@react-oauth/google';

const clientId = 'YOUR_CLIENT_ID.apps.googleusercontent.com';

function Login() {
  const onSuccess = () => {
  };

  const onFailure = () => {
  };

  return (
      <GoogleLogin
        onSuccess={onSuccess}
        onFailure={onFailure}
      />
  );
}

export default Login;
