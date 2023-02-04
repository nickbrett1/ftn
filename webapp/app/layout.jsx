// These styles apply to every route in the application
/* eslint-disable react/prop-types */
import React from 'react';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <noscript>
          <meta httpEquiv="refresh" content="0; url=./nojs/page" />
        </noscript>
        <meta name="theme-color" content="black" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/icons/square-flag.svg" />
        <link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />
        <link
          rel="preconnect"
          href="https://res.cloudinary.com"
          crossOrigin="true"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
