import React from 'react';

export default function Head() {
  return (
    <>
      <meta
        name="description"
        content="Home automation and collaborative family household management"
      />
      <link rel="manifest" href="/manifest.webmanifest" />

      <meta name="theme-color" content="black" />
      <link rel="icon" href="/icons/favicon.ico" sizes="any" />
      <link rel="icon" type="image/svg+xml" href="/icons/square-flag.svg" />
      <link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />
      <link
        rel="preconnect"
        href="https://res.cloudinary.com"
        crossOrigin="true"
      />
      <title>British Empire Management</title>
    </>
  );
}
