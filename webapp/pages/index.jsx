import React from 'react';
import Head from 'next/head';
import styled from 'styled-components';
import Login from '../components/Login';

const Background = styled.div`
  width: 2914px;
  height: 100%;
  background-image: url(/images/unionjack-extra-large.webp);
  background-size: cover;
  position: absolute;
  background-repeat: no-repeat;

  @media screen and (max-width: 1536px) {
    background-image: url(/images/unionjack-large.webp);
    width: 1536px;
  }
  @media screen and (max-width: 1200px) {
    background-image: url(/images/unionjack-medium.webp);
    width: 1200px;
  }
  @media screen and (max-width: 900px) {
    background-image: url(/images/unionjack-small.webp);
    width: 900px;
  }
  @media screen and (max-width: 600px) {
    background-image: url(/images/unionjack-extra-small.webp);
    width: 600px;
  }
`;

export default function LandingFrame() {
  return (
    <>
      <Head>
        <meta
          name="description"
          content="Home automation and collaborative family household management"
        />
        <title>British Empire Management</title>
      </Head>
      <Background>
        <nav className="flex flex-wrap items-center justify-between bg-stone-800 p-4">
          <div className="mr-6 flex flex-shrink-0 items-center text-white">
            <span className="text-2xl tracking-tight">
              British Empire Management
            </span>
          </div>
          <div className="block w-full flex-grow flex-row-reverse lg:flex lg:w-auto">
            <Login />
          </div>
        </nav>
      </Background>
    </>
  );
}
