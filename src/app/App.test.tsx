import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { createDefaultAppData } from '../domain/models';
import { reconcileProgression } from '../domain/progression';
import { STORAGE_KEYS } from '../storage/appStorage';

describe('Training Arc app navigation and dashboard', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows real starting level and zero XP on the first-visit dashboard', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /bem-vindo de volta, protagonista/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Yotsuba Nakano/i })).toBeInTheDocument();
    expect(screen.getByText('Patamar 1')).toBeInTheDocument();
    expect(screen.getByText('0 XP')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso para o próximo nível' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('00')).toBeInTheDocument();
    expect(screen.getByText(/sua primeira sessão concluída vai aparecer aqui/i)).toBeInTheDocument();
    expect(screen.getByText(/seus marcos reais aparecerão aqui/i)).toBeInTheDocument();
  });

  it('shows the saved companion at a readable portrait scale across every main navigation page', async () => {
    const data = createDefaultAppData();
    data.companion.characterId = 'miku';
    data.companion.displayName = 'Miku';
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });

    const pageButtons = ['Rotinas', 'Exercícios', 'Treinar', 'Histórico', 'Agenda', 'Estatísticas', 'Planilha', 'Evolução', 'Mapa muscular', 'Progressão', 'Missões', 'Medalhas', 'Companheira', 'Configurações'];
    for (const page of pageButtons) {
      await user.click(screen.getAllByRole('button', { name: new RegExp(`^${page}$`) })[0]!);
      expect(await screen.findAllByRole('img', { name: /Miku Nakano/i })).not.toHaveLength(0);
    }
  }, 12000);

  it('opens the exercise library from the primary navigation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    await user.click(screen.getAllByRole('button', { name: 'Exercícios' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Catálogo de exercícios' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Supino reto com barra' })).toBeInTheDocument();
  });

  it('opens the training spreadsheet, exercise evolution and muscle map from navigation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    await user.click(screen.getByRole('button', { name: 'Planilha' }));
    expect(await screen.findByRole('heading', { name: 'Planilha de treino' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Evolução' }));
    expect(await screen.findByRole('heading', { name: 'Evolução de desempenho' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mapa muscular' }));
    expect(await screen.findByRole('heading', { name: 'Mapa muscular' })).toBeInTheDocument();
  });

  it('awards session XP once, unlocks a title and claims a mission reward through progression', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    await user.click(screen.getByRole('button', { name: 'Iniciar treino Upper A' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Iniciar sessão' }));
    await screen.findByRole('heading', { name: 'Upper A' });
    await user.type(screen.getAllByLabelText('Carga (kg)')[0]!, '20');
    await user.type(screen.getAllByLabelText('Repetições')[0]!, '8');
    await user.click(screen.getAllByRole('button', { name: 'Marcar série como concluída' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Finalizar treino' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finalizar sessão' }));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(stored.profile.totalXp).toBe(16);
    expect(stored.progression.xpAwards.filter((award) => award.sourceType === 'session')).toHaveLength(1);
    expect(stored.progression.unlockedTitles.map((title) => title.id)).toContain('first-step');

    await user.click(screen.getAllByRole('button', { name: 'Progressão' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Sua progressão' })).toBeInTheDocument();
    expect(screen.getByText('Primeiro Passo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resgatar recompensa' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Recompensa de 40 XP resgatada');
    const afterClaim = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(afterClaim.profile.totalXp).toBe(56);
    expect(afterClaim.progression.xpAwards.filter((award) => award.sourceType === 'mission')).toHaveLength(1);
  }, 10000);

  it('does not report a mission reward as claimed when persistence fails', async () => {
    const data = createDefaultAppData('2026-10-01T08:00:00.000Z');
    data.sessions.push({ id: 'finished', routineId: 'routine', routineName: 'Upper A', startedAt: '2026-10-20T10:00:00.000Z', completedAt: '2026-10-20T11:00:00.000Z', status: 'completed', exercises: [] });
    const prepared = reconcileProgression(data, '2026-10-20T12:00:00.000Z');
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(prepared));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    await user.click(screen.getAllByRole('button', { name: 'Progressão' })[0]!);
    await screen.findByRole('heading', { name: 'Sua progressão' });
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEYS.appData) throw new Error('quota');
      original.call(this, key, value);
    });
    await user.click(screen.getByRole('button', { name: 'Resgatar recompensa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar');
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(saved.progression.xpAwards.some((award) => award.sourceType === 'mission')).toBe(false);
    expect(screen.queryByText('Recompensa de 40 XP resgatada.')).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it('shows completed session records from saved data', async () => {
    const data = createDefaultAppData('2026-10-01T08:00:00.000Z');
    data.sessions.push({
      id: 'session-1', routineId: 'routine-upper-a', routineName: 'Upper A',
      startedAt: '2026-10-21T17:00:00.000Z', completedAt: '2026-10-21T18:00:00.000Z',
      status: 'completed', exercises: [],
    });
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const { container } = render(<App />);
    const sessionPanel = container.querySelector('.session-panel');
    if (!(sessionPanel instanceof HTMLElement)) throw new Error('Session panel was not rendered');
    expect(await within(sessionPanel).findByText('Upper A')).toBeInTheDocument();
    expect(sessionPanel?.querySelector('.session-count')?.textContent).toContain('01 sessões concluídas');
  });

  it('does not award retroactive XP to a valid historical session without a receipt', async () => {
    const data = createDefaultAppData('2026-10-01T08:00:00.000Z');
    data.profile.totalXp = 23;
    data.sessions.push({ id: 'legacy-completed', routineId: 'deleted-routine', routineName: 'Ficha preservada',
      startedAt: '2026-10-20T10:00:00.000Z', completedAt: '2026-10-20T11:00:00.000Z', status: 'completed', exercises: [] });
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));

    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(saved.profile.totalXp).toBe(23);
    expect(saved.progression.xpAwards).toContainEqual({ id: 'session:legacy-completed', sourceType: 'session', sourceId: 'legacy-completed', amount: 0, awardedAt: '2026-10-20T11:00:00.000Z' });
  });

  it('configures seven agenda decisions explicitly and keeps them after reloading', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    await user.click(screen.getAllByRole('button', { name: 'Agenda' })[0]!);
    await screen.findByRole('heading', { name: 'Agenda & sequência' });
    expect(screen.getByText('A agenda ainda não foi configurada')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Configurar semana' })[1]!);
    await user.click(screen.getByRole('button', { name: 'Marcar dias restantes como descanso' }));
    await user.selectOptions(screen.getByLabelText('Programação de Segunda-feira'), 'routine-upper-a');
    await user.click(screen.getByRole('button', { name: 'Salvar semana' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Programação semanal salva');
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(Object.keys(saved.weeklySchedule ?? {})).toHaveLength(7);
    expect(saved.weeklySchedule?.monday).toEqual({ type: 'workout', routineId: 'routine-upper-a' });
    expect(saved.weeklySchedule?.tuesday).toEqual({ type: 'rest' });
  });

  it('advances the sequence exactly once when the expected session completes', async () => {
    const data = createDefaultAppData();
    const routine = data.routines[0]!;
    data.workoutSequence = { routineIds: [routine.id], currentIndex: 0, repeat: true, processedSessionIds: [], completed: false };
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    await user.click(screen.getByRole('button', { name: `Iniciar treino ${routine.name}` }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Iniciar sessão' }));
    await screen.findByRole('heading', { name: routine.name });
    await user.click(screen.getByRole('button', { name: 'Finalizar treino' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finalizar sessão' }));
    const after = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(after.workoutSequence?.currentIndex).toBe(0);
    expect(after.workoutSequence?.processedSessionIds).toHaveLength(1);
    expect(after.workoutSequence?.lastCompletionMatched).toBe(true);
  });

  it('shows a saved level-up notification only after real XP crosses a level threshold', async () => {
    const data = createDefaultAppData();
    data.profile.totalXp = 95;
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    await user.click(screen.getAllByRole('button', { name: 'Treinar' })[0]!);
    await user.click(screen.getByRole('button', { name: /Iniciar Upper A/ }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Iniciar sessão' }));
    await user.click(screen.getByRole('button', { name: 'Finalizar treino' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finalizar sessão' }));
    expect(await screen.findByText('Nível 2 alcançado')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Dashboard' })[0]!);
    expect(screen.getAllByText('Nível 2 alcançado')).toHaveLength(1);
  });

  it('opens the routine selector in the functional training area', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    await user.click(screen.getByRole('button', { name: /Escolher treino/i }));
    expect(await screen.findByRole('heading', { name: 'Escolha sua ficha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar Upper A/ })).toBeInTheDocument();
  });

  it('navigates among sections and opens the mobile secondary menu', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    const historyButtons = screen.getAllByRole('button', { name: 'Histórico' });
    await user.click(historyButtons[0]!);
    expect(await screen.findByRole('heading', { name: 'Nenhuma sessão concluída ainda.' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mais' }));
    const moreMenu = screen.getByRole('button', { name: 'Mais' }).parentElement;
    expect(moreMenu).not.toBeNull();
    await user.click(within(moreMenu!).getByRole('button', { name: 'Companheira' }));
    expect(screen.getByRole('heading', { name: 'Sua companheira' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Personalizar o tom/ })).toBeInTheDocument();
  });
});
