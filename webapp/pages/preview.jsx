import React from 'react';
import Head from 'next/head';
import { Box, Typography } from '@mui/material';

export default function NoJs() {
  return (
    <>
      <Head>
        <meta name="description" content="Preview of Site" />
        <title>Preview</title>
      </Head>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography variant="h2">Preview</Typography>
      </Box>
    </>
  );
}
