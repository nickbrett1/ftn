import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { Typography, AppBar, Toolbar, Box } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './Login';

const UJ_EXTRA_LARGE_URL = require('../images/unionjack-extra-large.webp');
const UJ_LARGE_URL = require('../images/unionjack-large.webp');
const UJ_MEDIUM_URL = require('../images/unionjack-medium.webp');
const UJ_SMALL_URL = require('../images/unionjack-small.webp');
const UJ_EXTRA_SMALL_URL = require('../images/unionjack-extra-small.webp');

function LandingFrame() {
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
        <Box
          sx={{
            backgroundImage: {
              xs: `url(${UJ_EXTRA_SMALL_URL})`,
              sm: `url(${UJ_SMALL_URL})`,
              md: `url(${UJ_MEDIUM_URL})`,
              lg: `url(${UJ_LARGE_URL})`,
              xl: `url(${UJ_EXTRA_LARGE_URL})`,
            },
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            position: 'absolute',
            height: '100%',
            width: '100%',
          }}
        >
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                British Empire Management
              </Typography>
              <Login />
            </Toolbar>
          </AppBar>
        </Box>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default LandingFrame;

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<LandingFrame />);
