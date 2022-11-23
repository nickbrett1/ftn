import { createServer } from 'miragejs';
import index from '../worker/src/index';

jest.mock('toucan-js');

const env = {
  SENTRY_ENVIRONMENT: 'development',
  GOOGLE_CLIENT_SECRET: 123,
  GOOGLE_CLIENT_ID: 123,
  KV: { get: () => 'allowed', put: () => {} },
};

let server;
beforeEach(() => {
  server = createServer({
    routes() {
      this.get('https://bemstudios.uk', () => ({}));
      this.post('https://oauth2.googleapis.com/token', () => ({ json: '' }));
      this.get('https://www.googleapis.com/oauth2/v2/userinfo', () => ({
        verified_email: true,
        email: 'nick.brett1@gmail.com',
      }));
    },
  });
});
afterEach(() => {
  server.shutdown();
});

describe('Worker routing', () => {
  it('creates CSP', async () => {
    const mockedRedirect = jest.fn();
    global.Response.redirect = mockedRedirect;

    const response = await index.fetch(
      new Request('https://bemstudios.uk'),
      env
    );
    expect(response.headers.get('Content-Security-Policy')).toEqual(
      expect.anything()
    );
    expect(mockedRedirect).not.toBeCalled();
  });

  it('redirects to preview if not logged in', async () => {
    const mockedRedirect = jest.fn(() => ({ body: '' }));
    global.Response.redirect = mockedRedirect;

    await index.fetch(new Request('https://bemstudios.uk/home'), env, {});
    expect(mockedRedirect).toBeCalledWith('http://localhost:8787/preview', 307);
  });

  it('auth allows access', async () => {
    const response = await index.fetch(
      new Request('https://bemstudios.uk/auth?code=123'),
      env,
      {}
    );
    expect(response.headers.get('Location')).toEqual(
      'http://localhost:8787/home'
    );
  });

  it('auth denies access if not in KV', async () => {
    const mockedRedirect = jest.fn(() => ({ body: '' }));
    global.Response.redirect = mockedRedirect;

    await index.fetch(
      new Request('https://bemstudios.uk/auth?code=123'),
      {
        SENTRY_ENVIRONMENT: 'development',
        GOOGLE_CLIENT_SECRET: 123,
        GOOGLE_CLIENT_ID: 123,
        KV: { get: () => 'notallowed', put: () => {} },
      },
      {}
    );
    expect(mockedRedirect).toBeCalledWith('http://localhost:8787/preview', 307);
  });
});
