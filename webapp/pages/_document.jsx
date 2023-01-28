import Document, { Html, Head, Main, NextScript } from 'next/document';
import React from 'react';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <noscript>
            <meta httpEquiv="refresh" content="0; url=./nojs" />
          </noscript>
          <meta name="theme-color" content="black" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="icon" href="/icons/favicon.ico" sizes="any" />
          <link rel="icon" type="image/svg+xml" href="/icons/square-flag.svg" />
          <link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />
          <meta name="emotion-insertion-point" content="" />
          {this.props.emotionStyleTags}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
