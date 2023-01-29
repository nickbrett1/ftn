import React from 'react';

import Head from 'next/head';
import { CldImage } from 'next-cloudinary';
import { useQuery } from 'urql';
import { withUrqlClient } from 'next-urql';

const InfoQuery = `
	query {
		info {
			id
			owner
			categories {
				id
				name
				items {
					id
					name
					value
				}
			}
		}
	}
`;

const render = (data) => (
  <div>
    {data.info.categories.map((category) => (
      <div
        key={category.id}
        className="max-w-sm overflow-hidden rounded shadow-lg"
      >
        <div className="px-6 py-4">
          <div className="mb-2 text-xl font-bold text-white">
            {category.name}
          </div>
        </div>
        <CldImage
          width={600}
          height={800}
          src="https://res.cloudinary.com/dnwdr35zg/image/upload/v1675011729/unionjack.webp"
          alt="Test Image"
        />
      </div>
    ))}
  </div>
);

function Home() {
  const [result] = useQuery({
    query: InfoQuery,
  });

  const { data, fetching, error } = result;
  if (error) throw new Error(error.message);

  return (
    <>
      <Head>
        <meta
          name="description"
          content="Home automation and collaborative family household management"
        />
        <title>British Empire Management</title>
      </Head>
      <nav className="flex flex-wrap items-center justify-between bg-stone-800 p-4">
        <p className="text-xl font-semibold tracking-tight text-white">
          British Empire Management : Home
        </p>
      </nav>
      {fetching && <div>Loading...</div>}
      {data && render(data)}
    </>
  );
}

export default withUrqlClient(
  () => ({
    url:
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'staging'
        ? 'http://localhost:8787/graphql'
        : 'https://bemstudios.uk/graphql',
  }),
  { ssr: true }
)(Home);
