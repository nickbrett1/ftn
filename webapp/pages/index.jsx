import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Login from '../components/Login';
import background from '../public/images/unionjack-extra-large.webp';

export default function LandingFrame() {
  return (
    <div className="block">
      <Head>
        <meta
          name="description"
          content="Home automation and collaborative family household management"
        />
        <title>British Empire Management</title>
      </Head>
      <nav className="flex items-center bg-stone-800 p-4">
        <p className="whitespace-nowrap text-2xl tracking-tight text-white">
          British Empire Management
        </p>
        <div className="mr-0 ml-auto">
          <Login />
        </div>
      </nav>
      <Image src={background} layout="responsive" priority />
    </div>
  );
}
