// 404.js
import Image from 'next/image';
import React from 'react';
import Head from 'next/head';
import { Box } from '@mui/material';

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
        <Image src="https://http.cat/404" alt="" width="750" height="600" />
      </Box>
    </>
  );
}
