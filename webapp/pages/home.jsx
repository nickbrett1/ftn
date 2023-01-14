import React from 'react';
import { Typography, AppBar, Toolbar } from '@mui/material';
import Head from 'next/head';
import { useQuery } from 'urql';

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

export default function Home() {
  const [result] = useQuery({
    query: InfoQuery,
  });

  const { data, fetching, error } = result;

  return (
    <>
      <Head>
        <meta
          name="description"
          content="Home automation and collaborative family household management"
        />
        <title>British Empire Management</title>
      </Head>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            British Empire Management : Home
          </Typography>
        </Toolbar>
      </AppBar>
      {fetching && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && <div>Info: {JSON.stringify(data)}</div>}
    </>
  );
}
