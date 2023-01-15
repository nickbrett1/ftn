/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { CacheProvider } from '@emotion/react';
import Head from 'next/head';
import React from 'react';
import { createClient, Provider } from 'urql';

import createEmotionCache from '../mui/createEmotionCache';
import theme from '../mui/theme';

const clientSideEmotionCache = createEmotionCache();
const client = createClient({
  url:
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:8787/graphql'
      : 'https://bemstudios.uk/graphql',
});

export default function MyApp({
  Component,
  pageProps,
  emotionCache = clientSideEmotionCache,
}) {
  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Provider value={client}>
          <Component {...pageProps} />
        </Provider>
      </ThemeProvider>
    </CacheProvider>
  );
}
