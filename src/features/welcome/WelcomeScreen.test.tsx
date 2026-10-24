import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WelcomeScreen } from './WelcomeScreen';

describe('WelcomeScreen', () => {
  it('identifies the app and exposes the local readiness status', () => {
    render(<WelcomeScreen ready storageMessage={null} />);
    expect(screen.getByRole('heading', { name: /training arc 2.0/i })).toBeInTheDocument();
    expect(screen.getByText('Fundação local pronta.')).toBeInTheDocument();
  });
});
