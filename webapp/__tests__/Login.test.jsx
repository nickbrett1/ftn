import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import Login from '../components/Login';

describe('Login correctly', () => {
  it('logs in', () => {
    const loginSpy = jest.fn();
    const mockedInitialize = jest.fn();
    const mockedRequestCode = jest.fn();
    const mockedInitCodeClient = jest.fn(() => ({
      initialize: mockedInitialize,
      requestCode: mockedRequestCode,
    }));

    window.google = {
      accounts: {
        id: { initialize: mockedInitialize },
        oauth2: {
          initCodeClient: mockedInitCodeClient,
        },
      },
    };

    render(<Login />);
    const button = screen.getByText('Login');
    button.onclick = loginSpy;

    fireEvent.click(button);
    expect(loginSpy).toBeCalled();

    act(() => {
      document.scripts[0].onload();
    });

    expect(mockedInitialize).toBeCalled();
    expect(() =>
      mockedInitialize.mock.calls[0][0].callback({ credential: {} })
    ).toThrow();
    expect(() =>
      mockedInitCodeClient.mock.calls[0][0].callback({ error: 'error' })
    ).toThrow();
    expect(mockedInitCodeClient.mock.calls[0][0].redirect_uri).toBe(
      'https://bemstudios.uk/auth'
    );

    expect(mockedRequestCode).toBeCalled();
    expect(() => document.scripts[0].onerror()).toThrow();

    fireEvent.click(button);
    expect(mockedRequestCode).toBeCalledTimes(2);
  });

  it('goes to home after login', () => {
    document.cookie = 'auth=123';
    render(<Login />);
    fireEvent.click(screen.getByText('Home'));
  });
});
