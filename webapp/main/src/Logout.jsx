import React from 'react';
import { GoogleLogout } from '@react-oauth/google';

const clientId = 'YOUR_CLIENT_ID.apps.googleusercontent.com';

function Logout() {
  const onSuccess = () => {

  };

  return (
    <div>
      <GoogleLogout
        clientId={clientId}
        buttonText="Logout"
        onLogoutSuccess={onSuccess}
      />
    </div>
  );
}

export default Logout;
