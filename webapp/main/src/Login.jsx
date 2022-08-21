import React, { useEffect } from 'react';

function Login() {
  function handleCallbackResponse() {}

  useEffect(() => {
    /* global google */
    google.accounts.id.initialize({
      client_id:
        '263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com',
      callback: handleCallbackResponse,
    });

    google.accounts.id.renderButton(document.getElementById('signInDiv'), {
      theme: 'filled_black',
      size: 'large',
      text: 'signin',
      logo_alignment: 'left',
    });

    // google.accounts.id.prompt();
  }, []);

  return <div id="signInDiv" />;
}

export default Login;
