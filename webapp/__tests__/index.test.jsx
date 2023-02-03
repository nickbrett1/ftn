import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../app/page';



describe('App', () => {
  it('renders the app', () => {
    render(<App />);

    expect(screen.getByText('British Empire Management')).toBeInTheDocument();
  });
});
