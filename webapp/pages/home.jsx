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
import Image from 'next/image';
import { useQuery } from 'urql';
import { withUrqlClient } from 'next-urql';

import unionjack from '../public/images/unionjack-extra-small.webp';

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
      <Accordion key={category.id} defaultExpanded>
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
          {category.items.map((item) => (
            <Card sx={{ maxWidth: 345 }} key={item.id}>
              <CardActionArea>
                <CardMedia>
                  <Image
                    src={unionjack}
                    alt="Union Jack"
                    width={600}
                    height={800}
                    layout="responsive"
                    priority
                    placeholder="blur"
                  />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="div">
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.value}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </AccordionDetails>
      </Accordion>
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
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            British Empire Management : Home
          </Typography>
        </Toolbar>
      </AppBar>
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
