import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COMPANION_CHARACTERS } from '../../domain/companionCatalog';
import { CompanionPortrait } from './CompanionPortrait';
import { resolveCompanionPortrait } from './portraitAssets';

vi.mock('./portraitAssets', () => ({ resolveCompanionPortrait: vi.fn(() => '/assets/unavailable.webp') }));

describe('CompanionPortrait', () => {
  beforeEach(() => vi.mocked(resolveCompanionPortrait).mockReturnValue('/assets/unavailable.webp'));

  it('uses meaningful image alternative text and switches to a named fallback after load failure', () => {
    render(<CompanionPortrait character={COMPANION_CHARACTERS[2]!} displayName="Miku" mode="dashboard" />);
    const image = screen.getByRole('img', { name: 'Retrato de Miku Nakano, acompanhando Miku' });
    expect(image).toHaveAttribute('loading', 'lazy');
    fireEvent.error(image);
    expect(screen.getByRole('img', { name: /Retrato não disponível para Miku Nakano; nome exibido: Miku/ })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Retrato de Miku Nakano, acompanhando Miku' })).not.toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('shows the same name-preserving fallback when no local asset is bundled', () => {
    vi.mocked(resolveCompanionPortrait).mockReturnValue(null);
    render(<CompanionPortrait character={COMPANION_CHARACTERS[2]!} displayName="Miku" mode="card" />);
    expect(screen.getByRole('img', { name: /Retrato não disponível para Miku Nakano/ })).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Retrato de Miku Nakano/ })).not.toBeInTheDocument();
  });
});
