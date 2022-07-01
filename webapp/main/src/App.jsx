import { GoogleOAuthProvider } from '@react-oauth/google';
import React from 'react';
import { createRoot } from 'react-dom/client';
import Login from './Login';

function App() {
  return (<GoogleOAuthProvider>
    <h1>Login to British Empire Management!!!</h1>,
    <Login />
  </GoogleOAuthProvider>
  );
}

export default App;

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<App />);
