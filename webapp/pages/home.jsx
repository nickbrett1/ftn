import React from 'react';
import {
  Typography,
  AppBar,
  Toolbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  CardActionArea,
  CardMedia,
} from '@mui/material';
import SvgIcon from '@mui/material/SvgIcon';

import Head from 'next/head';
import { createClient, Provider, useQuery } from 'urql';

const client = createClient({
  url:
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:8787/graphql'
      : 'https://bemstudios.uk/graphql',
});

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
      <Accordion key={category.id} defaultExpanded="true">
        <AccordionSummary
          expandIcon={
            <SvgIcon
              height="48"
              viewBox="0 0 48 48"
              width="48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M33.17 17.17l-9.17 9.17-9.17-9.17-2.83 2.83 12 12 12-12z" />
              <path d="M0 0h48v48h-48z" fill="none" />
            </SvgIcon>
          }
        >
          <Typography variant="h4">{category.name}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Card sx={{ maxWidth: 345 }}>
            <CardActionArea>
              <CardMedia
                component="img"
                height="140"
                image="/images/unionjack-extra-small.webp"
                alt="green iguana"
              />
              <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                  Lizard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lizards are a widespread group of squamate reptiles, with over
                  6,000 species, ranging
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </AccordionDetails>
      </Accordion>
    ))}
  </div>
);

export default function Home() {
  const [result] = useQuery({
    query: InfoQuery,
  });

  const { data, fetching, error } = result;
  if (error) throw new Error(error.message);

  return (
    <Provider value={client}>
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
      {data && render(data)}
    </Provider>
  );
}
