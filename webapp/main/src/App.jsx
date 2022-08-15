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
import { Typography, Grid, AppBar, Toolbar } from '@mui/material';

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
      primary: {
        main: '#3f51b5',
      },
      secondary: {
        main: '#f50057',
      },
    },
    typography: {
      useNextVariants: true
    }
  });

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline/>
      <div style={style}>
        <AppBar position='static'>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              British Empire Management
            </Typography>
            <GoogleOAuthProvider clientId='263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com'>
              <Login />
            </GoogleOAuthProvider>
          </Toolbar>
        </AppBar>
      </div>
    </ThemeProvider>)
}

export default LandingFrame;

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<LandingFrame />);
