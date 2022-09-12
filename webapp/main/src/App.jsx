import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Typography, AppBar, Toolbar } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './Login';

const UNION_JACK_URL = require('../images/unionjack.webp');

function LandingFrame() {
  const style = {
    // eslint-disable-next-line global-require
    backgroundImage: `url(${UNION_JACK_URL})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    position: 'absolute',
    height: '100%',
    width: '100%',
  };

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#3f51b5',
      },
      secondary: {
        main: '#f50057',
      },
    },
    typography: {
      useNextVariants: true,
    },
  });

  return (
    <GoogleOAuthProvider
      clientId="263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com"
      onScriptLoadError={() => {
        throw new Error('Failed to load GoogleOAuthProvider');
      }}
    >
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <div style={style}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                British Empire Management
              </Typography>
              <Login />
            </Toolbar>
          </AppBar>
        </div>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default LandingFrame;

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<LandingFrame />);
