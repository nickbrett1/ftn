import React from 'react';
import Head from 'next/head';

export default function FiveHundred() {
  return (
    <>
      <Head>
        <meta name="description" content="Internal Error" />
        <title>Something Went Wrong</title>
      </Head>
      <div className="flex h-screen bg-black text-8xl text-white">
        <div className="m-auto">
          <h1>Something Went Wrong</h1>
        </div>
      </div>
    </>
  );
}
