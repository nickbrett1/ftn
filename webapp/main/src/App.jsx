import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { GoogleOAuthProvider } from '@react-oauth/google';
import React from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Login from './Login';

function LandingFrameMessage() {
  const style = {
    margin: 'auto',
    padding: '10% 10% 10% 10%',
    color: 'white'
  }

  return <div style={style}>
    <div style={{'fontSize': '6em'}}>
      British Empire Management
    </div>
    <div style={{'fontSize': '3em', 'marginBottom' : '15px'}}>
      The Sun Never Sets
    </div>
    
    <GoogleOAuthProvider clientId='263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com'>
      <Login />
    </GoogleOAuthProvider>
  </div>
}

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function LandingFrame() {
  const style = {
    'backgroundImage': 'url(' + require('./images/unionjack.jpg') + ')',
    'backgroundRepeat': 'no-repeat',
    'backgroundSize': 'cover',
    'position': 'absolute',
    'height': '100%',
    'width': '100%',
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline/>
      <div style={style}>
      <LandingFrameMessage />
      </div>
    </ThemeProvider>)
}

export default LandingFrame;

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<LandingFrame />);
