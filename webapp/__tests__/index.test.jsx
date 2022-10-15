import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingFrame from '../pages';

describe('LandingFrame', () => {
  it('renders the landing frame', () => {
    render(<LandingFrame />);

    expect(screen.getByText('British Empire Management')).toBeInTheDocument();
  });
});
