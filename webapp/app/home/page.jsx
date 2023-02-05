import React from 'react';
import Head from 'next/head';

const render = (data) => (
  <div>
    {data.categories.map((category) => (
      <div
        key={category.id}
        className="max-w-sm overflow-hidden rounded shadow-lg"
      >
        <div className="px-6 py-4">
          <div className="mb-2 text-xl font-bold text-white">
            {category.name}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const Home = async () => {
  const data = {
    id: 1,
    owner: 'nick.brett1@gmail.com',
    categories: [
      {
        id: 2,
        name: 'Travel',
        items: [
          {
            id: 3,
            name: 'Passport',
            value: '123456789',
          },
          {
            id: 4,
            name: 'BA Executive Club',
            value: '123456789',
          },
          {
            id: 5,
            name: 'Known Traveler Number',
            value: '123456789',
          },
          {
            id: 6,
            name: 'Jet Blue TrueBlue',
            value: '123456789',
          },
        ],
      },
      {
        id: 6,
        name: 'Identification',
        items: [
          {
            id: 7,
            name: 'National Insurance Number',
            value: '123456789',
          },
          {
            id: 8,
            name: 'Social Security Number',
            value: '123456789',
          },
        ],
      },
      {
        id: 9,
        name: 'Healthcare',
        items: [
          {
            id: 10,
            name: 'Two Sigma Dental Group Number',
            value: '123456789',
          },
        ],
      },
    ],
  };

  return (
    <>
      <Head>
        <meta
          name="description"
          content="Home automation and collaborative family household management"
        />
        <title>British Empire Management</title>
        <link
          rel="preload"
          as="image"
          href="https://res.cloudinary.com/dnwdr35zg/image/upload/v1675011729/unionjack.webp"
        />
      </Head>
      <nav className="flex flex-wrap items-center bg-stone-800 p-3">
        <p className="py-1 pr-3 text-2xl tracking-tight text-white">
          British Empire Management : Home
        </p>
      </nav>
      {data && render(data)}
    </>
  );
};

export default Home;
