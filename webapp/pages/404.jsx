// 404.js
import React from 'react';
import Head from 'next/head';

export default function FourOhFour() {
  return (
    <>
      <Head>
        <meta name="description" content="Page not found" />
        <title>Page Not Found</title>
      </Head>
      <div className="flex h-screen bg-black text-8xl text-white">
        <div className="m-auto">
          <h1>Page Not Found</h1>
        </div>
      </div>
    </>
  );
}
