import { render, screen } from '@testing-library/react';
import LandingFrame from '../pages';
import '@testing-library/jest-dom';

describe('LandingFrame', () => {
  it('renders the landing frame', () => {
    render(<LandingFrame />);

    expect(screen.getByText('British Empire Management')).toBeInTheDocument();
  });
});
