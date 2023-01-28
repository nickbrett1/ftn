import { createClient, Provider } from 'urql';
import * as NextImage from 'next/image';
import '../app/globals.css';

const client = createClient({ url: 'http://localhost:8787/graphql' });

const OriginalNextImage = NextImage.default;

Object.defineProperty(NextImage, 'default', {
  configurable: true,
  value: (props) => (
    <OriginalNextImage {...props} unoptimized blurDataURL={props.src} />
  ),
});

export const decorators = [
  (Story) => (
    <Provider value={client}>
      <Story />
    </Provider>
  ),
];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  previewTabs: {
    'storybook/docs/panel': { index: -1 },
  },
};
