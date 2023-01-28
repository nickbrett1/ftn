/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import 'normalize.css/normalize.css';
import '../app/globals.css';
import React from 'react';

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
