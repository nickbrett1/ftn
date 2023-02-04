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
      </head>
      <body>{children}</body>
    </html>
  );
}
