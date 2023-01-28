import React from 'react';
import Head from 'next/head';

export default function NoJs() {
  return (
    <>
      <Head>
        <meta name="description" content="No JavaScript enabled" />
        <title>JavaScript Not Enabled</title>
      </Head>
      <div className="flex h-screen bg-black text-8xl text-white">
        <div className="m-auto">
          <h1>Javascript Not Enabled</h1>
        </div>
      </div>
    </>
  );
}
