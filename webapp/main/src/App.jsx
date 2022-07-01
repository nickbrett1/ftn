import React from 'react';
import { createRoot } from 'react-dom/client';
import Login from './Login';

function App() {
  return (
    [
      <h1>Login to British Empire Management!!!</h1>,
      <Login />,
    ]
  );
}

export default App;

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<App />);
