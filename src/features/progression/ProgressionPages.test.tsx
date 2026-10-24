import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { createDefaultAppData } from '../../domain/models';
import { STORAGE_KEYS } from '../../storage/appStorage';

describe('mission and medal navigation', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows current daily and weekly objectives without inventing completed progress', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    await user.click(screen.getByRole('button', { name: 'Missões' }));
    expect(await screen.findByRole('heading', { name: 'Central de missões' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Missões diárias' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Missões semanais' })).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar').every((bar) => bar.getAttribute('aria-valuenow') === '0')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Resgatar recompensa' })).not.toBeInTheDocument();
  });

  it('presents locked and unlocked medals from persisted completion history', async () => {
    const data = createDefaultAppData();
    data.sessions = [{ id: 'done', routineId: 'routine-upper-a', routineName: 'Upper A', startedAt: '2026-10-20T10:00:00.000Z', completedAt: '2026-10-20T11:00:00.000Z', status: 'completed', exercises: [] }];
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    await user.click(screen.getByRole('button', { name: 'Medalhas' }));
    expect(await screen.findByRole('heading', { name: 'Medalhas & títulos' })).toBeInTheDocument();
    expect(screen.getByText('Despertar')).toBeInTheDocument();
    expect(screen.getByText('Em Movimento')).toBeInTheDocument();
    expect(screen.getAllByText('BLOQUEADA').length).toBeGreaterThan(0);
    expect(screen.getByText(/1\/3 obtidos/)).toBeInTheDocument();
  });
});
