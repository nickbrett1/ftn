import { GoogleOAuthProvider } from '@react-oauth/google';
import React from 'react';
import { createRoot } from 'react-dom/client';
import Login from './Login';

function LandingFrameMessage() {
  const style = {
    margin: "auto",
    padding: "10% 35% 10% 15%",
    color: "white"
  }

  return <div style={style}>
    <div style={{"fontSize": "96px"}}>
      British Empire Management
    </div>
    <div style={{"fontSize": "36px"}}>
      The sun never sets
    </div>
    <br />
    <GoogleOAuthProvider>
      <Login />
    </GoogleOAuthProvider>
  </div>
}


function LandingFrame() {
  const style = {
    'backgroundImage': 'url(' + require('./images/unionjack.jpg') + ')',
    'backgroundRepeat': 'no-repeat',
    'backgroundSize': 'cover',
    'position': 'absolute',
    'height': '100%',
    'width': '100%'
  }

  return <div style={style}>
    <LandingFrameMessage />
  </div>
}

export default LandingFrame;

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<LandingFrame />);
