import React from 'react';
import Head from 'next/head';
import { CldImage } from 'next-cloudinary';
import Login from '../components/Login';

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
      <nav className="flex flex-wrap items-center bg-stone-800 p-3">
        <p className="whitespace-nowrap py-1 pr-3 text-2xl tracking-tight text-white">
          British Empire Management
        </p>
        <div className="mr-0 ml-auto">
          <Login />
        </div>
      </nav>
      <CldImage
        width="1536"
        height="2048"
        src="https://res.cloudinary.com/dnwdr35zg/image/upload/v1675011729/unionjack.webp"
        alt="Union Jack Background"
        layout="responsive"
        priority
      />
    </div>
  );
}
