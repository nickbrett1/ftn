// 404.js
import React from 'react';
import Head from 'next/head';
import { Box, Typography } from '@mui/material';

export default function FourOhFour() {
  return (
    <>
      <Head>
        <meta name="description" content="Page not found" />
        <title>Page Not Found</title>
      </Head>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography variant="h1">Page Not Found</Typography>
      </Box>
    </>
  );
}
