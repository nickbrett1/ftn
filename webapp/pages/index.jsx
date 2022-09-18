import React from 'react';
import { Typography, AppBar, Toolbar, Box } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Head from 'next/head';
import Login from '../components/Login';

export default function LandingFrame() {
  return (
    <>
      <Head>
        <meta
          name="description"
          content="Home automation and collaborative family household management"
        />
        <title>British Empire Management</title>
      </Head>
      <GoogleOAuthProvider
        clientId="263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com"
        onScriptLoadError={() => {
          throw new Error('Failed to load GoogleOAuthProvider');
        }}
      >
        <Box
          sx={{
            backgroundImage: {
              xs: 'url(/images/unionjack-extra-small.webp)',
              sm: 'url(/images/unionjack-small.webp)',
              md: 'url(/images/unionjack-medium.webp)',
              lg: 'url(/images/unionjack-large.webp)',
              xl: 'url(/images/unionjack-extra-large.webp)',
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
      </GoogleOAuthProvider>
    </>
  );
}
