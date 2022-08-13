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
import { Typography, Box } from '@mui/material';

function LandingFrameMessage() {
  const style = {
    margin: 'auto',
    padding: '10% 10% 10% 10%',
    color: 'white'
  }

  return (
    <Box maxWidth='sm' padding='30px'>
      <Typography variant='h1'>
        British Empire Management
      </Typography>
      <Typography variant='h3'>
        The Sun Never Sets
      </Typography>
      
      <GoogleOAuthProvider clientId='263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com'>
        <Login />
      </GoogleOAuthProvider>
    </Box>
  )
}



function LandingFrame() {
  const style = {
    'backgroundImage': 'url(' + require('./images/unionjack.jpg') + ')',
    'backgroundRepeat': 'no-repeat',
    'backgroundSize': 'cover',
    'position': 'absolute',
    'height': '100%',
    'width': '100%',
  }

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

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
