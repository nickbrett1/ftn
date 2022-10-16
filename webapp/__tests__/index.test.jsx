import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingFrame from '../pages';

jest.mock('@react-oauth/google');

describe('LandingFrame', () => {
  it('renders the landing frame', () => {
    render(<LandingFrame />);

    expect(screen.getByText('British Empire Management')).toBeInTheDocument();
  });
});
