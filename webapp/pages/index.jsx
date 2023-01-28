import React from 'react';
import Head from 'next/head';
import styled from 'styled-components';
import Login from '../components/Login';

const Background = styled.div`
  width: 100%;
  height: 100%;
  background-image: url(/images/unionjack-extra-large.webp);
  position: absolute;
  background-repeat: no-repeat;

  @media screen and (max-width: 1536px) {
    background-image: url(/images/unionjack-large.webp);
  }
  @media screen and (max-width: 1200px) {
    background-image: url(/images/unionjack-medium.webp);
  }
  @media screen and (max-width: 900px) {
    background-image: url(/images/unionjack-small.webp);
  }
  @media screen and (max-width: 600px) {
    background-image: url(/images/unionjack-extra-small.webp);
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
        <nav className="flex items-center bg-stone-800 p-4">
          <p className="whitespace-nowrap text-2xl tracking-tight text-white">
            British Empire Management
          </p>
          <div className="mr-0 ml-auto">
            <Login />
          </div>
        </nav>
      </Background>
    </>
  );
}
