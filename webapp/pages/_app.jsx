/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import { ThemeProvider } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import React from 'react';
import { createTheme } from '@mui/material/styles';
import createEmotionCache from '../utils/createEmotionCache';

const clientSideEmotionCache = createEmotionCache();

function MyApp({
  Component,
  emotionCache = clientSideEmotionCache,
  pageProps,
}) {
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
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={darkTheme}>
        <Component {...pageProps} />
      </ThemeProvider>
    </CacheProvider>
  );
}

export default MyApp;
