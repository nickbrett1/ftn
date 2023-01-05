import testkit from 'sentry-testkit/dist/jestMock';
import { createServer } from 'miragejs';
import index from '../worker/src/index';

jest.mock('toucan-js');

const DEFAULT_ENV = {
  SENTRY_ENVIRONMENT: 'development',
  GOOGLE_CLIENT_SECRET: 123,
  GOOGLE_CLIENT_ID: 123,
  KV: { get: () => 'allowed', put: () => {}, delete: () => {} },
};

let server;
beforeEach(() => {
  server = createServer({
    routes() {
      this.get('https://bemstudios.uk', () => ({}));
      this.get('https://bemstudios.uk/home', (x) => x);
      this.post('https://oauth2.googleapis.com/token', () => ({ json: '' }));
      this.get('https://www.googleapis.com/oauth2/v2/userinfo', () => ({
        verified_email: true,
      }));
      this.post('https://oauth2.googleapis.com/revoke');
    },
  });

  global.Response.redirect = jest.fn(() => ({ body: '' }));
});
afterEach(() => {
  server.shutdown();
});

describe('Worker routing', () => {
  it('creates CSP', async () => {
    const response = await index.fetch(
      new Request('https://bemstudios.uk'),
      DEFAULT_ENV
    );
    expect(response.headers.get('Content-Security-Policy')).toEqual(
      expect.anything()
    );
    expect(global.Response.redirect).not.toBeCalled();
  });

  it('redirects to preview if not logged in', async () => {
    await index.fetch(
      new Request('https://bemstudios.uk/home'),
      DEFAULT_ENV,
      {}
    );
    expect(global.Response.redirect).toBeCalledWith(
      'http://localhost:8787/preview',
      307
    );
  });

  it('auth allows access if in KV', async () => {
    const response = await index.fetch(
      new Request('https://bemstudios.uk/auth?code=123'),
      DEFAULT_ENV,
      {}
    );
    expect(response.headers.get('Location')).toEqual(
      'http://localhost:8787/home'
    );
  });

  it('auth denies access if not in KV', async () => {
    await index.fetch(
      new Request('https://bemstudios.uk/auth?code=123'),
      { ...DEFAULT_ENV, KV: { get: () => 'not allowed', put: () => {} } },
      {}
    );
    expect(global.Response.redirect).toBeCalledWith(
      'http://localhost:8787/preview',
      307
    );
  });

  it('allows access if logged in', async () => {
    const response = await index.fetch(
      new Request('https://bemstudios.uk/home', {
        headers: { cookie: 'auth=123' },
      }),
      { ...DEFAULT_ENV, KV: { get: (x) => (x === 123 ? x : 'allowed') } },
      {}
    );

    expect(response.url).toEqual('https://bemstudios.uk/home');
  });

  it('logs out', async () => {
    const response = await index.fetch(
      new Request('https://bemstudios.uk/logout', {
        headers: { cookie: 'auth=123' },
      }),
      {
        ...DEFAULT_ENV,
        KV: { get: (x) => (x === 123 ? x : 'allowed'), delete: () => {} },
      },
      { waitUntil: (x) => x }
    );

    expect(response.headers.get('Set-Cookie')).toEqual('auth=deleted; secure;');
    expect(response.headers.get('Location')).toEqual('http://localhost:8787');
  });

  it('redirect to preview on no auth cookie', async () => {
    await index.fetch(
      new Request('https://bemstudios.uk/home', {
        headers: { cookie: 'fake' },
      }),
      DEFAULT_ENV,
      {}
    );

    expect(global.Response.redirect).toBeCalledWith(
      'http://localhost:8787/preview',
      307
    );
  });

  it('reports to sentry if invalid env for auth', async () => {
    await expect(
      index.fetch(
        new Request('https://bemstudios.uk/auth?code=123'),
        {
          ...DEFAULT_ENV,
          GOOGLE_CLIENT_SECRET: undefined,
        },
        {}
      )
    ).rejects.toThrow(Error);
  });

  it('redirect to preview on no access token', async () => {});
});
