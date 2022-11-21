import index from '../worker/src/index';

jest.mock('toucan-js');

describe('Worker routing', () => {
  it('creates CSP', async () => {
    const mockedRedirect = jest.fn();
    global.Response = jest
      .fn()
      .mockImplementation(() => ({ headers: new Headers() }));
    global.Response.redirect = mockedRedirect;

    global.fetch = jest.fn(() => ({ body: {} }));

    const response = await index.fetch(
      { url: 'https://bemstudios.uk' },
      { SENTRY_ENVIRONMENT: 'development' },
      {}
    );

    expect(response.headers.get('Content-Security-Policy')).toEqual(
      expect.anything()
    );
  });
});
