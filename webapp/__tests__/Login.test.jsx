import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '../components/Login';

jest.mock('@react-oauth/google');

describe('Login click', () => {
  it('generates an onClick on Button press', () => {
    const loginSpy = jest.fn();
    render(<Login />);

    const button = screen.getByText('Login');
    button.onclick = loginSpy;
    fireEvent.click(button);

    expect(loginSpy).toBeCalled();
  });
});
