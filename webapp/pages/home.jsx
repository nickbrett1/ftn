import React from 'react';
import { Typography, AppBar, Toolbar } from '@mui/material';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <meta
          name="description"
          content="Home automation and collaborative family household management"
        />
        <title>British Empire Management</title>
      </Head>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            British Empire Management : Home
          </Typography>
        </Toolbar>
      </AppBar>
    </>
  );
}
