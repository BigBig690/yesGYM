import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { createDefaultAppData } from '../../domain/models';
import { serializeBackup } from '../../domain/backup';
import { STORAGE_KEYS } from '../../storage/appStorage';

async function settings(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: /bem-vindo de volta/i });
  await user.click(screen.getByRole('button', { name: 'Configurações' }));
  await screen.findByRole('heading', { name: 'Configurações' });
}

describe('backup e restauração na interface', () => {
  beforeEach(() => window.localStorage.clear());

  it('exports a JSON download with a descriptive local filename', async () => {
    const user = userEvent.setup();
    const urlCreate = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const urlRevoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    let downloadedName = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloadedName = this.download; });
    render(<App />);
    await settings(user);
    await user.click(screen.getByRole('button', { name: /Exportar backup JSON/ }));
    expect(await screen.findByText(/Backup JSON exportado/)).toBeInTheDocument();
    expect(click).toHaveBeenCalled();
    expect(urlCreate).toHaveBeenCalled();
    expect(urlRevoke).toHaveBeenCalledWith('blob:test');
    expect(downloadedName).toMatch(/^training-arc-2-backup-\d{4}-\d{2}-\d{2}\.json$/);
    urlCreate.mockRestore(); urlRevoke.mockRestore(); click.mockRestore();
  });

  it('validates and previews a backup, then cancellation leaves all current storage unchanged', async () => {
    const active = createDefaultAppData('2026-10-01T08:00:00.000Z');
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(active));
    const before = window.localStorage.getItem(STORAGE_KEYS.appData);
    const replacement = createDefaultAppData('2026-10-02T08:00:00.000Z');
    replacement.profile.displayName = 'Backup Hero';
    const text = serializeBackup(replacement, '2026-10-22T10:00:00.000Z');
    const user = userEvent.setup();
    render(<App />);
    await settings(user);
    await user.upload(screen.getByLabelText('Selecionar arquivo JSON'), new File([text], 'arc.json', { type: 'application/json' }));
    expect(await screen.findByRole('heading', { name: 'Conteúdo do arquivo' })).toBeInTheDocument();
    expect(screen.getByText(/Rotinas \/ exercícios/).parentElement).toHaveTextContent('4 /');
    await user.click(screen.getByRole('button', { name: 'Restaurar este backup' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/Serão substituídos rotinas/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Voltar' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar importação' }));
    expect(window.localStorage.getItem(STORAGE_KEYS.appData)).toBe(before);
    expect(screen.getByRole('status')).toHaveTextContent(/importação cancelada/i);
  });

  it('restores after explicit confirmation, updates the visible settings, and does not replay XP', async () => {
    const current = createDefaultAppData('2026-10-01T08:00:00.000Z');
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(current));
    const replacement = createDefaultAppData('2026-10-02T08:00:00.000Z');
    replacement.profile.displayName = 'Kira';
    replacement.profile.totalXp = 321;
    replacement.sessions.push({ id: 'session-old', routineId: 'removed', routineName: 'Ficha arquivada', startedAt: '2026-10-02T09:00:00.000Z', completedAt: '2026-10-02T10:00:00.000Z', status: 'completed', exercises: [] });
    replacement.progression.xpAwards.push({ id: 'session:session-old', sourceType: 'session', sourceId: 'session-old', amount: 0, awardedAt: '2026-10-02T10:00:00.000Z' });
    replacement.sessions.push({ id: 'session-active', routineId: 'routine-1', routineName: 'Upper A', startedAt: '2026-10-03T09:00:00.000Z', status: 'in-progress', exercises: [], restTimer: { status: 'running', durationSeconds: 60, remainingSeconds: 30, endsAt: '2026-10-03T09:00:30.000Z' } });
    const user = userEvent.setup();
    render(<App />);
    await settings(user);
    await user.upload(screen.getByLabelText('Selecionar arquivo JSON'), new File([serializeBackup(replacement)], 'restore.json', { type: 'application/json' }));
    await screen.findByRole('heading', { name: 'Conteúdo do arquivo' });
    await user.click(screen.getByRole('button', { name: 'Restaurar este backup' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Substituir dados e restaurar' }));
    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEYS.appData)).toContain('session-active'));
    expect(await screen.findByRole('status')).toHaveTextContent(/Backup restaurado com sucesso/);
    expect(screen.getByLabelText('Nome ou apelido')).toHaveValue('Kira');
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(saved.profile.totalXp).toBe(321);
    expect(saved.progression.xpAwards.filter((award) => award.sourceType === 'session')).toHaveLength(1);
    expect(saved.sessions.find((session) => session.id === 'session-active')?.restTimer?.endsAt).toBe('2026-10-03T09:00:30.000Z');
    expect(saved.sessions.find((session) => session.id === 'session-old')?.routineId).toBe('removed');
  });

  it('shows a read error for invalid JSON and does not touch persisted values', async () => {
    const original = JSON.stringify(createDefaultAppData());
    window.localStorage.setItem(STORAGE_KEYS.appData, original);
    const user = userEvent.setup();
    render(<App />);
    await settings(user);
    await user.upload(screen.getByLabelText('Selecionar arquivo JSON'), new File(['not json'], 'bad.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('JSON válido');
    expect(window.localStorage.getItem(STORAGE_KEYS.appData)).toBe(original);
  });

  it('reports a restoration write failure and retains the current app data', async () => {
    const originalData = createDefaultAppData('2026-10-01T08:00:00.000Z');
    originalData.profile.displayName = 'Existing';
    const originalRaw = JSON.stringify(originalData);
    window.localStorage.setItem(STORAGE_KEYS.appData, originalRaw);
    const replacement = createDefaultAppData('2026-10-02T08:00:00.000Z');
    replacement.profile.displayName = 'Replacement';
    const originalSetItem = Storage.prototype.setItem;
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEYS.appData && value.includes('Replacement')) throw new Error('quota');
      originalSetItem.call(this, key, value);
    });
    const user = userEvent.setup();
    render(<App />);
    await settings(user);
    await user.upload(screen.getByLabelText('Selecionar arquivo JSON'), new File([serializeBackup(replacement)], 'restore-failure.json', { type: 'application/json' }));
    await screen.findByRole('heading', { name: 'Conteúdo do arquivo' });
    await user.click(screen.getByRole('button', { name: 'Restaurar este backup' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Substituir dados e restaurar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/A restauração falhou/);
    expect(screen.queryByText(/Backup restaurado com sucesso/)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEYS.appData)).toBe(originalRaw);
    write.mockRestore();
  });
});
