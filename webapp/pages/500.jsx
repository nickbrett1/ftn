import React from 'react';
import Head from 'next/head';
import { Box, Typography } from '@mui/material';

export default function FiveHundred() {
  return (
    <>
      <Head>
        <meta name="description" content="Internal Error" />
        <title>Something Went Wrong</title>
      </Head>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography variant="h1">Something Went Wrong</Typography>
      </Box>
    </>
  );
}
