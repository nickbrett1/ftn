/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import 'normalize.css/normalize.css';
import '../app/globals.css';
import Head from 'next/head';
import React from 'react';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
