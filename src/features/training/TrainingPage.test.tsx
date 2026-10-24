import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import type { AppData } from '../../domain/models';
import { createDefaultAppData } from '../../domain/models';
import { STORAGE_KEYS } from '../../storage/appStorage';

async function startUpperA(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: /Bem-vindo de volta/ });
  await user.click(screen.getByRole('button', { name: 'Iniciar treino Upper A' }));
  const dialog = await screen.findByRole('alertdialog');
  expect(within(dialog).getByRole('heading', { name: 'Iniciar Upper A?' })).toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: 'Iniciar sessão' }));
  expect(await screen.findByRole('heading', { name: 'Upper A' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Supino reto com barra: posição inicial' })).toBeInTheDocument();
}

describe('execução e recuperação de sessões', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts from a dashboard routine shortcut, autosaves sets, recovers after reload and finalizes into history', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await startUpperA(user);
    const reps = screen.getAllByLabelText('Repetições')[0]!;
    const load = screen.getAllByLabelText('Carga (kg)')[0]!;
    await user.type(load, '22.5');
    await user.type(reps, '8');
    const activeBeforeMark = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as AppData;
    const savedSession = activeBeforeMark.sessions.find((item) => item.status === 'in-progress')!;
    expect(savedSession.exercises[0]?.performedSets[0]).toMatchObject({ load: 22.5, reps: 8, completed: false });
    await user.click(screen.getAllByRole('button', { name: 'Marcar série como concluída' })[0]!);
    expect(screen.getByRole('progressbar', { name: 'Séries concluídas' })).toHaveAttribute('aria-valuenow', '1');

    first.unmount();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Retomar Upper A' }));
    expect(await screen.findByText(/Sessão recuperada/)).toBeInTheDocument();
    expect(screen.getAllByLabelText('Carga (kg)')[0]).toHaveValue(22.5);
    expect(screen.getAllByLabelText('Repetições')[0]).toHaveValue(8);
    expect(screen.getByRole('button', { name: /Série concluída/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Finalizar treino' }));
    const confirmation = screen.getByRole('alertdialog');
    expect(confirmation).toHaveTextContent('Você concluiu 1 de');
    await user.click(within(confirmation).getByRole('button', { name: 'Finalizar sessão' }));
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as AppData;
    expect(saved.sessions).toHaveLength(1);
    expect(saved.sessions[0]).toMatchObject({ status: 'completed', durationSeconds: expect.any(Number) });

    await user.click(screen.getAllByRole('button', { name: 'Histórico' })[0]!);
    await user.click(await screen.findByRole('button', { name: /Upper A/ }));
    expect(await screen.findByText('22,5 kg')).toBeInTheDocument();
    expect(screen.getByText('8 reps')).toBeInTheDocument();
  }, 15_000);

  it('starts a session from the routine detail and never changes the session snapshot after routine edits', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /Bem-vindo de volta/ });
    await user.click(screen.getAllByRole('button', { name: 'Rotinas' })[0]!);
    await user.click(within(screen.getByLabelText('Lista de rotinas')).getByRole('button', { name: /Upper B/ }));
    await user.click(screen.getByRole('button', { name: 'Iniciar treino' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Iniciar sessão' }));
    expect(await screen.findByRole('heading', { name: 'Upper B' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Rotinas' })[0]!);
    await user.clear(screen.getByLabelText('Nome da rotina'));
    await user.type(screen.getByLabelText('Nome da rotina'), 'Upper B revisada');
    await user.click(screen.getByRole('button', { name: 'Salvar nome e observações da rotina' }));
    await user.click(screen.getAllByRole('button', { name: 'Treinar' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Upper B' })).toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as AppData;
    expect(stored.routines.find((routine) => routine.id === stored.sessions[0]?.routineId)?.name).toBe('Upper B revisada');
    expect(stored.sessions[0]?.routineName).toBe('Upper B');
  });

  it('does not start a second session and recovers the persisted rest timer from its end timestamp', async () => {
    const data = createDefaultAppData();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /Bem-vindo de volta/ });
    await user.click(screen.getByRole('button', { name: 'Iniciar treino Upper A' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Iniciar sessão' }));
    await screen.findByRole('heading', { name: 'Upper A' });
    expect(screen.queryByRole('button', { name: 'Iniciar treino Upper B' })).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Duração (segundos)'));
    await user.type(screen.getByLabelText('Duração (segundos)'), '90');
    await user.click(screen.getByRole('button', { name: 'Iniciar descanso' }));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as AppData;
    const session = stored.sessions.find((item) => item.status === 'in-progress')!;
    expect(session.restTimer?.status).toBe('running');
    expect(session.restTimer?.endsAt).toBeTruthy();
    expect(data.sessions).toHaveLength(0);
  });

  it('requires confirmation to discard and preserves completed history', async () => {
    const data = createDefaultAppData();
    data.sessions.push({ id: 'historic-session', routineId: 'deleted-routine', routineName: 'Registro anterior', startedAt: '2026-01-01T10:00:00.000Z', completedAt: '2026-01-01T10:30:00.000Z', status: 'completed', exercises: [], durationSeconds: 1800 });
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /Bem-vindo de volta/ });
    await user.click(screen.getByRole('button', { name: 'Iniciar treino Upper A' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Iniciar sessão' }));
    await screen.findByRole('heading', { name: 'Upper A' });
    await user.click(screen.getByRole('button', { name: 'Descartar sessão' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent(/serão descartados/);
    await user.click(within(dialog).getByRole('button', { name: 'Continuar treino' }));
    expect(screen.getByRole('heading', { name: 'Upper A' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Descartar sessão' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar sessão' }));
    expect(await screen.findByRole('heading', { name: 'Escolha sua ficha' })).toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as AppData;
    expect(saved.sessions.map((session) => session.id)).toEqual(['historic-session']);
  });

  it('keeps the last persisted set when an automatic write fails', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startUpperA(user);
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEYS.appData) throw new Error('quota');
      original.call(this, key, value);
    });
    await user.type(screen.getAllByLabelText('Repetições')[0]!, '7');
    expect(await screen.findByRole('alert')).toHaveTextContent('Alteração não salva');
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as AppData;
    expect(saved.sessions.find((item) => item.status === 'in-progress')?.exercises[0]?.performedSets[0]?.reps).toBeUndefined();
    spy.mockRestore();
  });
});
