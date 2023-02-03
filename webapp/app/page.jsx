import React from 'react';
import Image from 'next/legacy/image';
import Login from '../components/Login';

export default function Page() {
  return (
    <div className="block">
      <nav className="flex flex-wrap items-center bg-stone-800 p-3">
        <p className="whitespace-nowrap py-1 pr-3 text-2xl tracking-tight text-white">
          British Empire Management
        </p>
        <div className="mr-0 ml-auto">
          <Login />
        </div>
      </nav>
      <Image
        src="/v1675011729/unionjack.webp"
        alt="Union Jack Background"
        width={1536}
        height={2048}
      />
    </div>
  );
}
