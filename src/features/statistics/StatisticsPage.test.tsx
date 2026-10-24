import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { createDefaultAppData } from '../../domain/models';
import { STORAGE_KEYS } from '../../storage/appStorage';

describe('statistics page and dashboard summary', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows useful empty state and monthly calendar without demo data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    await user.click(screen.getByRole('button', { name: 'Estatísticas' }));
    expect(await screen.findByRole('heading', { name: 'Estatísticas & evolução' })).toBeInTheDocument();
    expect(screen.getByText('Seu histórico ainda está começando.')).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Calendário mensal de treinos' })).toBeInTheDocument();
    expect(screen.getByText('0 treinos concluídos neste mês')).toBeInTheDocument();
  });

  it('integrates actual sessions into the dashboard and supports period and exercise filtering', async () => {
    const data = createDefaultAppData('2026-10-01T08:00:00.000Z');
    const makeSession = (id: string, date: string, load: number) => ({ id, routineId: 'routine-upper-a', routineName: 'Upper A', startedAt: new Date(Date.parse(date) - 3600_000).toISOString(), completedAt: date, status: 'completed' as const, durationSeconds: 3600,
      exercises: [{ id: `performed-${id}`, sourceExerciseId: 'bench-id', name: id === 's1' ? 'Supino' : 'Supino inclinado', order: 0, plannedSets: [{ targetReps: 8 }], performedSets: [{ completed: true, load, reps: 8 }] }] });
    data.sessions.push(makeSession('s1', '2026-10-20T14:00:00.000Z', 40), makeSession('s2', '2026-10-22T14:00:00.000Z', 42));
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText('2 sessões concluídas nesta semana · 2 nos últimos 30 dias.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Estatísticas' }));
    await screen.findByRole('heading', { name: 'Estatísticas & evolução' });
    await user.selectOptions(screen.getByLabelText('Exercício'), 'bench-id');
    expect(screen.getByRole('img', { name: /evolução de cargas/i })).toBeInTheDocument();
    expect(screen.getByText('Maior carga · Supino inclinado')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Período'), '30d');
    expect(screen.getByText('40 kg × 8 reps')).toBeInTheDocument();
    await user.click(screen.getByRole('gridcell', { name: /20 de outubro de 2026/i }));
    const dayDetails = document.querySelector('.calendar-selection');
    expect(dayDetails).not.toBeNull();
    expect(within(dayDetails as HTMLElement).getByText('Upper A')).toBeInTheDocument();
  });

  it('keeps Statistics reachable through the mobile secondary navigation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    const moreMenu = screen.getByRole('button', { name: 'Mais' }).parentElement;
    expect(moreMenu).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Mais' }));
    await user.click(within(moreMenu!).getByRole('button', { name: 'Estatísticas' }));
    expect(await screen.findByRole('heading', { name: 'Estatísticas & evolução' })).toBeInTheDocument();
  });
});
