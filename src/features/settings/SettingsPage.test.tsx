import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { createDefaultAppData, validateAppData } from '../../domain/models';
import { getNarrative } from '../../domain/narrative';
import { STORAGE_KEYS } from '../../storage/appStorage';

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: /bem-vindo de volta/i });
  await user.click(screen.getByRole('button', { name: 'Configurações' }));
  expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument();
}

describe('personalização do Training Arc', () => {
  beforeEach(() => window.localStorage.clear());

  it('persists the protagonist, accent, narrative style and companion settings', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await openSettings(user);

    await user.clear(screen.getByLabelText('Nome ou apelido'));
    await user.type(screen.getByLabelText('Nome ou apelido'), 'Aki');
    await user.click(screen.getByLabelText('Crimson'));
    expect(document.querySelector('.app-frame')).toHaveAttribute('data-accent', 'crimson');
    await user.selectOptions(screen.getByLabelText('Estilo narrativo'), 'playful');
    expect(screen.queryByLabelText('Nome da companheira')).not.toBeInTheDocument();
    expect(document.querySelector('.companion-preview-card strong')).toHaveTextContent('Yotsuba Nakano');
    await user.click(screen.getByLabelText(/Rival amigável/));
    await user.type(screen.getByLabelText(/Nome personalizado para o estilo/), 'Desafiante');
    await user.click(screen.getByRole('button', { name: /Salvar configurações/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Preferências salvas neste dispositivo.');

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(saved.profile.displayName).toBe('Aki');
    expect(saved.preferences.accentColor).toBe('crimson');
    expect(saved.preferences.narrativeStyle).toBe('playful');
    expect(saved.companion.displayName).toBe('Yotsuba Nakano');
    expect(saved.companion.personality).toBe('friendly-rival');
    expect(saved.companion.personalityName).toBe('Desafiante');
    expect(validateAppData(saved)).toBe(true);

    unmount();
    render(<App />);
    expect(await screen.findByRole('heading', { name: /bem-vindo de volta, Aki/i })).toBeInTheDocument();
  }, 10000);

  it('restores visual and narrative preferences without removing routines or session history', async () => {
    const data = createDefaultAppData('2026-10-01T08:00:00.000Z');
    data.preferences = { ...data.preferences, accentColor: 'amber', narrativeStyle: 'calm', reduceMotion: true };
    data.routines[0]!.name = 'Upper A customizada';
    data.sessions.push({ id: 'past-1', routineId: 'old-routine', routineName: 'Registro anterior', startedAt: '2026-10-20T10:00:00.000Z', completedAt: '2026-10-20T11:00:00.000Z', status: 'completed', exercises: [] });
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    await openSettings(user);
    await user.click(screen.getByRole('button', { name: /Restaurar preferências visuais e narrativas/ }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Restaurar preferências' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Rotinas e histórico foram mantidos.');
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(saved.preferences.accentColor).toBe('purple-eclipse');
    expect(saved.preferences.narrativeStyle).toBe('epic');
    expect(saved.preferences.reduceMotion).toBe(false);
    expect(saved.routines[0]?.name).toBe('Upper A customizada');
    expect(saved.sessions[0]?.id).toBe('past-1');
  });

  it('does not claim preferences were saved when localStorage writing fails', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSettings(user);
    await user.type(screen.getByLabelText('Nome ou apelido'), 'Noa');
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEYS.appData) throw new Error('quota');
      original.call(this, key, value);
    });
    await user.click(screen.getByRole('button', { name: /Salvar configurações/ }));
    expect(spy).toHaveBeenCalled();
    expect(await screen.findByText(/Não foi possível salvar/)).toBeInTheDocument();
    expect(screen.queryByText('Preferências salvas neste dispositivo.')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEYS.appData)).toBeNull();
    spy.mockRestore();
  });

  it('offers the six accent palettes and applies each selection to the application frame', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await openSettings(user);
    const palettes = [
      ['Purple Eclipse', 'purple-eclipse'], ['Crimson', 'crimson'], ['Azure', 'azure'],
      ['Emerald', 'emerald'], ['Rose', 'rose'], ['Amber', 'amber'],
    ] as const;
    for (const [label, id] of palettes) {
      await user.click(screen.getByLabelText(label));
      expect(document.querySelector('.app-frame')).toHaveAttribute('data-accent', id);
      expect(screen.getByLabelText(label)).toBeChecked();
    }
    await user.click(screen.getByRole('button', { name: /Salvar configurações/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Preferências salvas neste dispositivo.');
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(saved.preferences.accentColor).toBe('amber');
    unmount();
    render(<App />);
    expect(await screen.findByRole('heading', { name: /bem-vindo de volta/i })).toBeInTheDocument();
    expect(document.querySelector('.app-frame')).toHaveAttribute('data-accent', 'amber');
  });

  it('shows the saved display-name preference and applies narrative styles without false event claims', async () => {
    const data = createDefaultAppData('2026-10-01T08:00:00.000Z');
    data.profile.displayName = 'Mina';
    data.preferences.narrativeStyle = 'calm';
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole('heading', { name: /bem-vindo de volta, Mina/i })).toBeInTheDocument();
    const sentence = getNarrative('opening', new Date('2026-10-22T08:00:00Z'), 'calm');
    expect(sentence).not.toMatch(/recorde|conquista|treino concluído/i);
    await user.click(screen.getByRole('button', { name: 'Configurações' }));
    const page = await screen.findByRole('heading', { name: 'Configurações' });
    expect(page).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Exibir o nome no Dashboard/ }));
    await user.click(screen.getByRole('button', { name: /Salvar configurações/ }));
    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEYS.appData)).toContain('"showDisplayName":false'));
  });
});
