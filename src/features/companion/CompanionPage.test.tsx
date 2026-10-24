import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { createDefaultAppData } from '../../domain/models';
import { STORAGE_KEYS } from '../../storage/appStorage';

async function openGallery(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: /bem-vindo de volta/i });
  await user.click(screen.getByRole('button', { name: 'Companheira' }));
  expect(await screen.findByRole('heading', { name: 'Sua companheira' })).toBeInTheDocument();
}

describe('companion gallery', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows each local portrait and selects a character persistently without losing other data', async () => {
    const data = createDefaultAppData('2026-10-01T08:00:00.000Z');
    data.routines[0]!.name = 'Upper A mantida';
    data.sessions.push({ id: 'archive-1', routineId: 'old', routineName: 'Histórico', startedAt: '2026-10-20T10:00:00.000Z', completedAt: '2026-10-20T11:00:00.000Z', status: 'completed', exercises: [] });
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    await openGallery(user);
    expect(screen.getAllByRole('img', { name: /Retrato de/ })).toHaveLength(10);
    await user.click(screen.getByRole('button', { name: 'Ver detalhes de Marin Kitagawa' }));
    const dialog = screen.getByRole('dialog', { name: 'Marin Kitagawa' });
    expect(within(dialog).getByText('My Dress-Up Darling')).toBeInTheDocument();
    expect(within(dialog).getByText(/deixar a jornada com a sua cara/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Escolher companheira' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Marin Kitagawa agora acompanha sua jornada.');
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(saved.companion.characterId).toBe('marin-kitagawa');
    expect(saved.companion.displayName).toBe('Marin Kitagawa');
    expect(saved.routines[0]?.name).toBe('Upper A mantida');
    expect(saved.sessions[0]?.id).toBe('archive-1');
  });

  it('does not change the visible or persisted selection when saving fails', async () => {
    const data = createDefaultAppData();
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    await openGallery(user);
    await user.click(screen.getByRole('button', { name: 'Ver detalhes de Ichika Nakano' }));
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEYS.appData) throw new Error('quota');
      original.call(this, key, value);
    });
    await user.click(within(screen.getByRole('dialog', { name: 'Ichika Nakano' })).getByRole('button', { name: 'Escolher companheira' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A seleção não foi salva');
    expect(window.localStorage.getItem(STORAGE_KEYS.appData)).toBe(JSON.stringify(data));
    expect(screen.getByText('Yotsuba Nakano', { selector: '#companion-page-title' })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('continues to display a previously saved Miku selection', async () => {
    const data = createDefaultAppData();
    data.companion.characterId = 'miku';
    data.companion.displayName = 'Miku';
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    await openGallery(user);
    expect(screen.getByText('Miku Nakano', { selector: '#companion-page-title' })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /Retrato de Miku Nakano/ })).toHaveLength(2);
    const selectedCard = document.querySelector('.companion-choice.is-selected');
    expect(selectedCard).not.toBeNull();
    expect(within(selectedCard as HTMLElement).getByRole('heading', { name: 'Miku Nakano' })).toBeInTheDocument();
  });

  it('shows only the nine confirmed characters grouped into their three romance series', async () => {
    const fresh = createDefaultAppData();
    expect(fresh.companion.characterId).toBe('yotsuba-nakano');
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(fresh));
    const user = userEvent.setup();
    render(<App />);
    await openGallery(user);
    expect(screen.getAllByRole('button', { name: /Ver (detalhes|seleção) de/ })).toHaveLength(9);
    expect(screen.getByRole('region', { name: 'The Quintessential Quintuplets' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'My Dress-Up Darling' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'The Fragrant Flower Blooms with Dignity' })).toBeInTheDocument();
    expect(screen.queryByText(/Naruto Uzumaki|Tanjiro Kamado|Monkey D\. Luffy/)).not.toBeInTheDocument();
  });

  it('filters the gallery by series and restores the full collection', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openGallery(user);
    await user.click(screen.getByRole('button', { name: 'My Dress-Up Darling' }));
    expect(screen.getByRole('heading', { name: 'Marin Kitagawa' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ichika Nakano' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Todas as séries' }));
    expect(screen.getByRole('heading', { name: 'Ichika Nakano' })).toBeInTheDocument();
  });

  it('recovers an older removed character selection to Yotsuba without losing other user data', async () => {
    const data = createDefaultAppData();
    data.companion = { ...data.companion, characterId: 'tanjiro-kamado', displayName: 'Tanjiro Kamado', personality: 'strategist', personalityName: 'Observadora' };
    data.profile.totalXp = 280;
    data.routines[0]!.name = 'Ficha preservada';
    data.sessions.push({ id: 'archive-1', routineId: 'deleted', routineName: 'Histórico antigo', startedAt: '2026-10-20T10:00:00.000Z', completedAt: '2026-10-20T11:00:00.000Z', status: 'completed', exercises: [] });
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    await openGallery(user);
    expect(screen.getByText('Yotsuba Nakano', { selector: '#companion-page-title' })).toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(saved.companion).toMatchObject({ characterId: 'yotsuba-nakano', displayName: 'Yotsuba Nakano', personality: 'strategist', personalityName: 'Observadora' });
    expect(saved.profile.totalXp).toBe(280);
    expect(saved.routines[0]?.name).toBe('Ficha preservada');
    expect(saved.sessions[0]?.id).toBe('archive-1');
  });

  it('normalizes legacy companion display names to canonical names while preserving personality settings', async () => {
    const data = createDefaultAppData();
    data.companion.displayName = 'Hoshi';
    data.companion.personality = 'strategist';
    data.companion.personalityName = 'Observadora';
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    await openGallery(user);
    await user.click(screen.getByRole('button', { name: 'Ver detalhes de Marin Kitagawa' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Marin Kitagawa' })).getByRole('button', { name: 'Escolher companheira' }));
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(saved.companion).toMatchObject({ characterId: 'marin-kitagawa', displayName: 'Marin Kitagawa', personality: 'strategist', personalityName: 'Observadora' });
    expect(screen.getByText('Marin Kitagawa', { selector: '#companion-page-title' })).toBeInTheDocument();
  });

  it('uses the selected Miku portrait slot on both Dashboard and the active training page', async () => {
    const data = createDefaultAppData();
    data.companion.characterId = 'miku';
    data.companion.displayName = 'Miku';
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(data));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /bem-vindo de volta/i });
    expect(screen.getByRole('img', { name: 'Retrato de Miku Nakano, acompanhando Miku Nakano' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Escolher treino/i }));
    await user.click(screen.getByRole('button', { name: /Iniciar Upper A/ }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Iniciar sessão' }));
    expect(await screen.findByRole('heading', { name: 'Upper A' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Retrato de Miku Nakano, acompanhando Miku Nakano' })).toBeInTheDocument();
  });
});
